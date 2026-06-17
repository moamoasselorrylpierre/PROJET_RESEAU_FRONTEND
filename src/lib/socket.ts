// ============================================================
//  KamerStay — lib/socket.ts
//  Connexion WebSocket temps réel avec Socket.io
//  Le backend Node.js envoie les notifications temps réel
//  via Socket.io
// ============================================================
//
//  DÉPENDANCES À INSTALLER :
//  npm install socket.io-client
// ============================================================

import { io, Socket } from "socket.io-client";
import { getToken, getUser } from "./auth";

// ── Configuration ──────────────────────────────────────────

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

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
//  CLASSE PRINCIPALE — KamerStaySocket
// ══════════════════════════════════════════════════════════

class KamerStaySocket {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<NotificationHandler>> = new Map();
  private isConnected: boolean = false;

  // ── Connexion ────────────────────────────────────────────

  /**
   * Initialise et connecte le client Socket.io.
   * À appeler après la connexion de l'utilisateur.
   * Le token JWT est passé en query param pour que Node.js valide la connexion.
   */
  connect(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.socket) {
        resolve();
        return;
      }

      const token = getToken();
      if (!token) {
        reject(new Error("Token JWT absent. Connectez-vous d'abord."));
        return;
      }

      try {
        this.socket = io(WS_URL, {
          auth: {
            token: `Bearer ${token}`,
            userId: String(userId),
          },
          reconnection: true,
          reconnectionDelay: 5000,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: 5,
        });

        // ── Connexion réussie ──
        this.socket.on("connect", () => {
          console.log("[Socket] Connecté au serveur WebSocket");
          this.isConnected = true;

          // Le serveur envoie un événement de confirmation
          this.socket?.emit("rejoindre", { userId, role: getUser()?.role });

          resolve();
        });

        // ── Réception des événements ──
        this.socket.on("reservation_confirmee", (data) => {
          this._dispatch("notifications", {
            id: String(Date.now()),
            type: "RESERVATION_CONFIRMEE",
            titre: "Réservation confirmée",
            message: "Votre réservation a été confirmée",
            data,
            timestamp: new Date().toISOString(),
            lu: false,
          });
        });

        this.socket.on("nouvelle_reservation", (data) => {
          this._dispatch("notifications", {
            id: String(Date.now()),
            type: "RESERVATION_RECUE",
            titre: "Nouvelle réservation",
            message: "Vous avez reçu une nouvelle réservation",
            data,
            timestamp: new Date().toISOString(),
            lu: false,
          });
        });

        this.socket.on("reservation_annulee", (data) => {
          this._dispatch("notifications", {
            id: String(Date.now()),
            type: "RESERVATION_ANNULEE",
            titre: "Réservation annulée",
            message: "Une réservation a été annulée",
            data,
            timestamp: new Date().toISOString(),
            lu: false,
          });
        });

        this.socket.on("reservation_refusee", (data) => {
          this._dispatch("notifications", {
            id: String(Date.now()),
            type: "RESERVATION_ANNULEE",
            titre: "Réservation refusée",
            message: "Votre réservation a été refusée par l'hôte",
            data,
            timestamp: new Date().toISOString(),
            lu: false,
          });
        });

        // ── Erreur de connexion ──
        this.socket.on("connect_error", (error: Error) => {
          console.error("[Socket] Erreur de connexion :", error.message);
          this.isConnected = false;
          reject(error);
        });

        // ── Déconnexion ──
        this.socket.on("disconnect", () => {
          console.log("[Socket] Déconnecté du serveur");
          this.isConnected = false;
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Déconnexion ──────────────────────────────────────────

  /** Déconnecte proprement le WebSocket */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.handlers.clear();
      console.log("[Socket] Déconnexion propre effectuée");
    }
  }

  // ── Dispatch des messages reçus ──────────────────────────

  private _dispatch(channel: string, notif: SocketNotification): void {
    const channelHandlers = this.handlers.get(channel);
    if (channelHandlers) {
      channelHandlers.forEach((handler) => handler(notif));
    }
    // Dispatch global (tous les canaux)
    const globalHandlers = this.handlers.get("*");
    if (globalHandlers) {
      globalHandlers.forEach((handler) => handler(notif));
    }
  }

  // ── API publique ─────────────────────────────────────────

  /**
   * S'abonner aux notifications d'un canal.
   * @param channel "notifications" | "*" (tous)
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

  /** Vérifie si le socket est connecté */
  get connected(): boolean {
    return this.isConnected;
  }
}

// ══════════════════════════════════════════════════════════
//  SINGLETON — une seule instance dans toute l'app
// ══════════════════════════════════════════════════════════

export const socketService = new KamerStaySocket();

// ══════════════════════════════════════════════════════════
//  HOOK REACT — useSocket
//  À utiliser dans les composants Next.js
// ══════════════════════════════════════════════════════════

import { useEffect, useCallback } from "react";

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
