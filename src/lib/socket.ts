// ============================================================
//  NidiRoom — lib/socket.ts
//  Connexion WebSocket temps réel (STOMP over SockJS)
//  Le backend Spring Boot reçoit les events Kafka et les
//  pousse aux clients via WebSocket/STOMP
// ============================================================
//
//  DÉPENDANCES À INSTALLER :
//  npm install @stomp/stompjs sockjs-client
//  npm install --save-dev @types/sockjs-client
// ============================================================

import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken } from "./auth";

// ── Configuration ──────────────────────────────────────────

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";

// ── Types ──────────────────────────────────────────────────

export type NotificationType =
  | "RESERVATION_RECUE"       // Hôte : nouvelle réservation
  | "RESERVATION_CONFIRMEE"   // Locataire : réservation confirmée
  | "RESERVATION_ANNULEE"     // Les deux : réservation annulée
  | "PAIEMENT_RECU"           // Hôte : paiement reçu
  | "NOUVEL_AVIS"             // Hôte : nouvel avis laissé
  | "MESSAGE_RECU"            // Message privé
  | "SYSTEM";                 // Notification système

export interface SocketNotification {
  id: string;
  type: NotificationType;
  titre: string;
  message: string;
  data?: Record<string, unknown>; // données supplémentaires (ex: id réservation)
  timestamp: string;
  lu: boolean;
}

export type NotificationHandler = (notif: SocketNotification) => void;

// ══════════════════════════════════════════════════════════
//  CLASSE PRINCIPALE — NidiRoomSocket
// ══════════════════════════════════════════════════════════

class NidiRoomSocket {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private handlers: Map<string, Set<NotificationHandler>> = new Map();
  private reconnectDelay: number = 5000;
  private isConnected: boolean = false;

  // ── Connexion ────────────────────────────────────────────

  /**
   * Initialise et connecte le client STOMP.
   * À appeler après la connexion de l'utilisateur.
   * Le token JWT est passé dans les headers STOMP pour
   * que Spring Security valide la connexion WebSocket.
   */
  connect(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const token = getToken();
      if (!token) {
        reject(new Error("Token JWT absent. Connectez-vous d'abord."));
        return;
      }

      this.client = new Client({
        // SockJS comme transport (fallback si WebSocket natif bloqué)
        webSocketFactory: () => new SockJS(WS_URL),

        // Headers d'authentification envoyés lors du handshake STOMP
        connectHeaders: {
          Authorization: `Bearer ${token}`,
          "user-id": String(userId),
        },

        // Reconnexion automatique toutes les 5 secondes
        reconnectDelay: this.reconnectDelay,

        // ── Connexion réussie ──
        onConnect: () => {
          console.log("[Socket] Connecté au serveur WebSocket");
          this.isConnected = true;

          // Abonnement aux notifications personnelles de l'utilisateur
          // Spring Boot publie sur /user/{userId}/queue/notifications
          this._subscribe(
            `/user/${userId}/queue/notifications`,
            "notifications",
            (msg) => this._dispatch("notifications", msg)
          );

          // Abonnement aux notifications globales (ex: annonces système)
          this._subscribe(
            "/topic/annonces",
            "annonces-globales",
            (msg) => this._dispatch("annonces-globales", msg)
          );

          resolve();
        },

        // ── Erreur STOMP ──
        onStompError: (frame) => {
          console.error("[Socket] Erreur STOMP :", frame.headers["message"]);
          this.isConnected = false;
          reject(new Error(frame.headers["message"]));
        },

        // ── Déconnexion ──
        onDisconnect: () => {
          console.log("[Socket] Déconnecté");
          this.isConnected = false;
        },

        // ── WebSocket fermé ──
        onWebSocketClose: () => {
          console.warn("[Socket] WebSocket fermé — tentative de reconnexion…");
          this.isConnected = false;
        },
      });

      this.client.activate();
    });
  }

  // ── Déconnexion ──────────────────────────────────────────

  /** Déconnecte proprement le WebSocket */
  disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.handlers.clear();
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      console.log("[Socket] Déconnexion propre effectuée");
    }
  }

  // ── Abonnement interne ───────────────────────────────────

  private _subscribe(
    destination: string,
    key: string,
    callback: (msg: IMessage) => void
  ): void {
    if (!this.client || !this.isConnected) return;

    const sub = this.client.subscribe(destination, callback);
    this.subscriptions.set(key, sub);
  }

  // ── Dispatch des messages reçus ──────────────────────────

  private _dispatch(channel: string, msg: IMessage): void {
    try {
      const notif: SocketNotification = JSON.parse(msg.body);
      const channelHandlers = this.handlers.get(channel);
      if (channelHandlers) {
        channelHandlers.forEach((handler) => handler(notif));
      }
      // Dispatch global (tous les canaux)
      const globalHandlers = this.handlers.get("*");
      if (globalHandlers) {
        globalHandlers.forEach((handler) => handler(notif));
      }
    } catch (err) {
      console.error("[Socket] Erreur parsing message :", err);
    }
  }

  // ── API publique ─────────────────────────────────────────

  /**
   * S'abonner aux notifications d'un canal.
   * @param channel "notifications" | "annonces-globales" | "*" (tous)
   * @param handler fonction appelée à chaque message reçu
   * @returns fonction de désabonnement
   *
   * @example
   * const unsub = socketService.on("notifications", (notif) => {
   *   console.log("Nouvelle notif :", notif.message);
   * });
   * // Plus tard :
   * unsub();
   */
  on(channel: string, handler: NotificationHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);

    // Retourne une fonction de désabonnement
    return () => {
      this.handlers.get(channel)?.delete(handler);
    };
  }

  /**
   * Envoyer un message au backend via STOMP.
   * Utilisé pour les actions temps réel (ex: marquer comme lu).
   */
  send(destination: string, body: Record<string, unknown>): void {
    if (!this.client || !this.isConnected) {
      console.warn("[Socket] Non connecté — message non envoyé");
      return;
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  /** Marquer une notification comme lue via WebSocket */
  marquerLue(notifId: string): void {
    this.send("/app/notifications/lire", { id: notifId });
  }

  /** Vérifie si le socket est connecté */
  get connected(): boolean {
    return this.isConnected;
  }
}

// ══════════════════════════════════════════════════════════
//  SINGLETON — une seule instance dans toute l'app
// ══════════════════════════════════════════════════════════

export const socketService = new NidiRoomSocket();

// ══════════════════════════════════════════════════════════
//  HOOK REACT — useSocket
//  À utiliser dans les composants Next.js
// ══════════════════════════════════════════════════════════

import { useEffect, useCallback } from "react";
import { getUser } from "./auth";

/**
 * Hook React pour s'abonner aux notifications WebSocket.
 *
 * @example
 * // Dans un composant :
 * useSocket("notifications", (notif) => {
 *   setNotifications(prev => [notif, ...prev]);
 *   showToast(notif.message);
 * });
 */
export function useSocket(
  channel: string,
  handler: NotificationHandler
): void {
  const stableHandler = useCallback(handler, []); // eslint-disable-line

  useEffect(() => {
    // Ne s'exécute que côté client
    if (typeof window === "undefined") return;

    const user = getUser();
    if (!user) return;

    // Connexion si pas déjà connecté
    if (!socketService.connected) {
      socketService.connect(user.id).catch((err) => {
        console.error("[useSocket] Erreur de connexion :", err);
      });
    }

    // Abonnement au canal
    const unsub = socketService.on(channel, stableHandler);

    // Nettoyage au démontage du composant
    return () => {
      unsub();
    };
  }, [channel, stableHandler]);
}

// ══════════════════════════════════════════════════════════
//  UTILITAIRES NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/** Retourne l'emoji correspondant au type de notification */
export function getNotifIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    RESERVATION_RECUE:     "📅",
    RESERVATION_CONFIRMEE: "✅",
    RESERVATION_ANNULEE:   "❌",
    PAIEMENT_RECU:         "💳",
    NOUVEL_AVIS:           "⭐",
    MESSAGE_RECU:          "💬",
    SYSTEM:                "🔔",
  };
  return icons[type] || "🔔";
}

/** Formate le timestamp d'une notification */
export function formatNotifTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffJ = Math.floor(diffH / 24);

  if (diffMin < 1)  return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24)   return `Il y a ${diffH}h`;
  if (diffJ < 7)    return `Il y a ${diffJ}j`;
  return date.toLocaleDateString("fr-FR");
}
