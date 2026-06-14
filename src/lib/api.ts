// ============================================================
//  NidiRoom — lib/api.ts
//  Toutes les fonctions d'appel vers le backend Spring Boot
//  Base URL : http://localhost:8080  (Spring Boot par défaut)
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ── Types globaux ──────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: "LOCATAIRE" | "HOTE" | "ADMIN";
  telephone?: string;
  photo?: string;
  twoFactorEnabled?: boolean;
}

export interface Annonce {
  id: number;
  titre: string;
  description: string;
  ville: string;
  adresse: string;
  prix_par_nuit: number;
  capacite: number;
  superficie?: number;
  image_principale?: string;
  images?: string[];
  note_moyenne?: number;
  nombre_avis?: number;
  hote?: User;
  latitude?: number;
  longitude?: number;
  disponible: boolean;
}

export interface Reservation {
  id: number;
  annonce: Annonce;
  locataire: User;
  date_debut: string;
  date_fin: string;
  statut: "EN_ATTENTE" | "CONFIRMEE" | "ANNULEE" | "TERMINEE";
  montant_total: number;
  created_at: string;
}

export interface Avis {
  id: number;
  auteur: User;
  annonce_id: number;
  note: number;
  commentaire: string;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  mot_de_passe: string;
}

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe: string;
  role: "LOCATAIRE" | "HOTE";
  telephone?: string;
}

export interface AnnoncePayload {
  titre: string;
  description: string;
  ville: string;
  adresse: string;
  prix_par_nuit: number;
  capacite: number;
  superficie?: number;
  latitude?: number;
  longitude?: number;
}

export interface ReservationPayload {
  annonce_id: number;
  date_debut: string;
  date_fin: string;
}

export interface SearchParams {
  ville?: string;
  capacite?: number;
  prix_max?: number;
  prix_min?: number;
  page?: number;
  size?: number;
}

// ── Utilitaire principal ───────────────────────────────────

/**
 * Fonction fetch centralisée.
 * Ajoute automatiquement le token JWT si présent dans localStorage.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Récupère le token JWT stocké après login
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Token expiré ou invalide → déconnexion automatique
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return { data: null, error: "Session expirée. Reconnectez-vous.", status: 401 };
    }

    // Pas de contenu (DELETE, etc.)
    if (res.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: json?.message || json?.error || "Une erreur est survenue.",
        status: res.status,
      };
    }

    return { data: json, error: null, status: res.status };
  } catch (err) {
    console.error("[API Error]", err);
    return {
      data: null,
      error: "Impossible de joindre le serveur. Vérifiez que le backend est démarré.",
      status: 0,
    };
  }
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════

/** Connexion — retourne token JWT + infos utilisateur */
export async function login(payload: LoginPayload) {
  return apiFetch<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Inscription */
export async function register(payload: RegisterPayload) {
  return apiFetch<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Profil de l'utilisateur connecté */
export async function getMe() {
  return apiFetch<User>("/api/auth/me");
}

/** Déconnexion côté serveur (invalide le token si blacklist Redis) */
export async function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

/** Vérification du code 2FA */
export async function verify2FA(code: string) {
  return apiFetch<{ token: string; user: User }>("/api/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// ══════════════════════════════════════════════════════════
//  ANNONCES
// ══════════════════════════════════════════════════════════

/** Liste des annonces avec filtres optionnels */
export async function getAnnonces(params?: SearchParams) {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  return apiFetch<{ annonces: Annonce[]; total: number; page: number }>(`/api/annonces${query}`);
}

/** Détail d'une annonce */
export async function getAnnonce(id: number) {
  return apiFetch<Annonce>(`/api/annonces/${id}`);
}

/** Créer une annonce (HOTE seulement) */
export async function createAnnonce(payload: AnnoncePayload) {
  return apiFetch<Annonce>("/api/annonces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Modifier une annonce */
export async function updateAnnonce(id: number, payload: Partial<AnnoncePayload>) {
  return apiFetch<Annonce>(`/api/annonces/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Supprimer une annonce */
export async function deleteAnnonce(id: number) {
  return apiFetch<void>(`/api/annonces/${id}`, { method: "DELETE" });
}

/** Uploader une image pour une annonce (MinIO) */
export async function uploadAnnonceImage(id: number, file: File) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${BASE_URL}/api/annonces/${id}/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json();
  return { data: json, error: res.ok ? null : json?.message, status: res.status };
}

// ══════════════════════════════════════════════════════════
//  RÉSERVATIONS
// ══════════════════════════════════════════════════════════

/** Créer une réservation */
export async function createReservation(payload: ReservationPayload) {
  return apiFetch<Reservation>("/api/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Mes réservations (en tant que locataire) */
export async function getMesReservations() {
  return apiFetch<Reservation[]>("/api/reservations/mes-reservations");
}

/** Réservations reçues (en tant qu'hôte) */
export async function getReservationsRecues() {
  return apiFetch<Reservation[]>("/api/reservations/recues");
}

/** Confirmer une réservation (HOTE) */
export async function confirmerReservation(id: number) {
  return apiFetch<Reservation>(`/api/reservations/${id}/confirmer`, {
    method: "PUT",
  });
}

/** Annuler une réservation */
export async function annulerReservation(id: number) {
  return apiFetch<Reservation>(`/api/reservations/${id}/annuler`, {
    method: "PUT",
  });
}

// ══════════════════════════════════════════════════════════
//  AVIS
// ══════════════════════════════════════════════════════════

/** Avis d'une annonce */
export async function getAvis(annonceId: number) {
  return apiFetch<Avis[]>(`/api/annonces/${annonceId}/avis`);
}

/** Laisser un avis */
export async function createAvis(
  annonceId: number,
  payload: { note: number; commentaire: string }
) {
  return apiFetch<Avis>(`/api/annonces/${annonceId}/avis`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ══════════════════════════════════════════════════════════
//  PAIEMENTS
// ══════════════════════════════════════════════════════════

/** Initier un paiement pour une réservation */
export async function initierPaiement(reservationId: number) {
  return apiFetch<{ payment_url: string; reference: string }>(
    `/api/paiements/initier/${reservationId}`,
    { method: "POST" }
  );
}

/** Vérifier le statut d'un paiement */
export async function verifierPaiement(reference: string) {
  return apiFetch<{ statut: string; montant: number }>(
    `/api/paiements/verifier/${reference}`
  );
}

// ══════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════════

/** Récupérer les notifications de l'utilisateur */
export async function getNotifications() {
  return apiFetch<{ id: number; message: string; lu: boolean; created_at: string }[]>(
    "/api/notifications"
  );
}

/** Marquer une notification comme lue */
export async function marquerNotificationLue(id: number) {
  return apiFetch<void>(`/api/notifications/${id}/lire`, { method: "PUT" });
}
