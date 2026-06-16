// ============================================================
//  NidiRoom — lib/api.ts
//  Toutes les fonctions d'appel vers le backend Node.js
//  Base URL : http://localhost:4000  (Node.js par défaut)
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  role: "CLIENT" | "HOTE";
  telephone?: string;
  photo?: string;
  raison_sociale?: string;  // Pour les HOTEs
}

export interface Annonce {
  id: number;
  hote_id: number;
  titre: string;
  description?: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  prix: number;
  capacite: number;
  images?: string[];
  disponible: boolean;
  note_moyenne?: number;
  nb_avis?: number;
  nb_reservations?: number;
  hote_nom?: string;
  hote_prenom?: string;
  created_at?: string;
  updated_at?: string;
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
  role: "CLIENT" | "HOTE";
  telephone?: string;
  raison_sociale?: string;  // Pour les HOTEs
}

export interface AnnoncePayload {
  titre: string;
  description?: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  prix: number;
  capacite: number;
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
    console.log(`[API] ${endpoint} →`, json);

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
  const result = await apiFetch<{ message: string; token: string; utilisateur: User }>("/api/auth/connexion", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  
  // Transformer la structure du backend (utilisateur → user)
  if (result.data) {
    return {
      data: {
        token: result.data.token,
        user: result.data.utilisateur,
      },
      error: result.error,
      status: result.status,
    };
  }
  return result as any;
}

/** Inscription */
export async function register(payload: RegisterPayload) {
  const result = await apiFetch<{ message: string; token: string; utilisateur: User }>("/api/auth/inscription", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  
  // Transformer la structure du backend (utilisateur → user)
  if (result.data) {
    return {
      data: {
        token: result.data.token,
        user: result.data.utilisateur,
      },
      error: result.error,
      status: result.status,
    };
  }
  return result as any;
}

/** Profil de l'utilisateur connecté */
export async function getMe() {
  return apiFetch<User>("/api/auth/profil");
}

/** Déconnexion */
export async function logout() {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

// ══════════════════════════════════════════════════════════
//  ANNONCES
// ══════════════════════════════════════════════════════════

/** Liste des annonces avec filtres optionnels (publique) */
export async function getAnnonces(params?: SearchParams) {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  return apiFetch<{ annonces: Annonce[]; pagination: { total: number; page: number; limit: number; total_pages: number } }>(`/api/annonces${query}`);
}

/** Mes annonces (HOTE) */
export async function getMesAnnonces() {
  return apiFetch<Annonce[]>("/api/annonces/mes-annonces");
}

/** Détail d'une annonce */
export async function getAnnonce(id: number) {
  return apiFetch<Annonce>(`/api/annonces/${id}`);
}

/** Créer une annonce (HOTE seulement) */
export async function createAnnonce(payload: AnnoncePayload) {
  return apiFetch<{ message: string; annonce: Annonce }>("/api/annonces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Modifier une annonce */
export async function updateAnnonce(id: number, payload: Partial<AnnoncePayload>) {
  return apiFetch<{ message: string; annonce: Annonce }>(`/api/annonces/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Supprimer une annonce */
export async function deleteAnnonce(id: number) {
  return apiFetch<{ message: string }>(`/api/annonces/${id}`, { method: "DELETE" });
}

/** Uploader une image pour une annonce */
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

/** Supprimer une image d'une annonce */
export async function deleteAnnonceImage(id: number, imageId: number) {
  return apiFetch<{ message: string }>(`/api/annonces/${id}/images/${imageId}`, {
    method: "DELETE",
  });
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
  return apiFetch<Reservation[]>("/api/reservations/hote");
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
  return apiFetch<Avis[]>(`/api/avis/annonce/${annonceId}`);
}

/** Laisser un avis */
export async function createAvis(
  payload: { annonce_id: number; note: number; commentaire: string }
) {
  return apiFetch<Avis>("/api/avis", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Mes avis */
export async function getMesAvis() {
  return apiFetch<Avis[]>("/api/avis/mes-avis");
}

// ══════════════════════════════════════════════════════════
//  PAIEMENTS
// ══════════════════════════════════════════════════════════

/** Effectuer un paiement pour une réservation */
export async function createPaiement(payload: { reservation_id: number }) {
  return apiFetch<{ success: boolean; message: string }>("/api/paiements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Obtenir les détails d'un paiement */
export async function getPaiement(reservationId: number) {
  return apiFetch<{ statut: string; montant: number }>(
    `/api/paiements/reservation/${reservationId}`
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
