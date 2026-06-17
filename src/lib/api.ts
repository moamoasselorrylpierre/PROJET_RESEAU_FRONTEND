// ============================================================
//  KamerStay — lib/api.ts
//  Client d'appel vers le backend Node.js (Room Renting)
//  Base : http://localhost:4000  — préfixe API : /api
//  Les noms de champs respectent EXACTEMENT le backend.
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Types ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export type Role = "CLIENT" | "HOTE";

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  raison_sociale?: string;
}

/** Annonce telle que renvoyée par le backend (colonnes pg en minuscules). */
export interface Annonce {
  id: number;
  hote_id?: number;
  titre: string;
  description?: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  prixparnuit?: number | string;
  prix?: number | string;
  capacite?: number;
  statut?: string;          // 'DISPONIBLE' | 'OCCUPEE' | …
  disponible?: boolean;
  images?: string[];
  note_moyenne?: number | string;
  nb_avis?: number | string;
  nb_reservations?: number | string;
  hote_nom?: string;
  hote_prenom?: string;
  raison_sociale?: string;
  datepublication?: string;
}

export type StatutReservation =
  | "EN_ATTENTE" | "CONFIRMEE" | "ANNULEE" | "TERMINEE" | "REFUSEE";

/** Réservation à plat (champs pg minuscules + colonnes jointes). */
export interface Reservation {
  idreservation: number;
  client_id?: number;
  annonce_id: number;
  datedebut: string;
  datefin: string;
  nombrepersonnes: number;
  montanttotal: number | string;
  statut: StatutReservation;
  // jointures (mes-reservations)
  annonce_titre?: string;
  ville?: string;
  quartier?: string;
  prixparnuit?: number | string;
  hote_nom?: string;
  hote_prenom?: string;
  images?: string[];
  // jointures (hôte)
  client_nom?: string;
  client_prenom?: string;
  client_email?: string;
}

export interface AvisItem {
  id: number;
  annonce_id: number;
  reservation_id: number;
  client_id?: number;
  note: number;
  commentaire?: string;
  dateevaluation?: string;
  client_nom?: string;
  client_prenom?: string;
  annonce_titre?: string;
  ville?: string;
}

export type ModePaiement = "CARTE" | "MOBILE_MONEY" | "ESPECES";

export interface SearchParams {
  ville?: string;
  capacite?: number;
  prix_min?: number;
  prix_max?: number;
  page?: number;
  limit?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ── Helpers ────────────────────────────────────────────────

function token(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

/** Normalise l'utilisateur renvoyé par le backend (typecompte → role). */
export function normalizeUser(raw: Record<string, unknown>): User {
  const role = (raw.role || raw.typeCompte || raw.typecompte) as Role;
  return {
    id: Number(raw.id),
    nom: String(raw.nom ?? ""),
    prenom: String(raw.prenom ?? ""),
    email: String(raw.email ?? ""),
    role: role === "HOTE" ? "HOTE" : "CLIENT",
    raison_sociale: (raw.raison_sociale as string) || undefined,
  };
}

/** Fetch JSON centralisé : ajoute le JWT, gère les erreurs. */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const t = token();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...options.headers,
  };
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    if (res.status === 204) return { data: null, error: null, status: 204 };
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { data: null, error: (json?.message || json?.error) ?? "Une erreur est survenue.", status: res.status };
    }
    return { data: json as T, error: null, status: res.status };
  } catch {
    return { data: null, error: "Impossible de joindre le serveur. Le backend est-il démarré ?", status: 0 };
  }
}

/** Fetch multipart (FormData) : pas de Content-Type forcé. */
async function apiUpload<T>(endpoint: string, method: "POST" | "PUT", form: FormData): Promise<ApiResponse<T>> {
  const t = token();
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: form,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { data: null, error: (json?.message || json?.error) ?? "Une erreur est survenue.", status: res.status };
    }
    return { data: json as T, error: null, status: res.status };
  } catch {
    return { data: null, error: "Impossible de joindre le serveur.", status: 0 };
  }
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════

export async function login(payload: { email: string; mot_de_passe: string }) {
  const res = await apiFetch<{ token: string; utilisateur: Record<string, unknown> }>(
    "/api/auth/connexion",
    { method: "POST", body: JSON.stringify({ email: payload.email, motDePasse: payload.mot_de_passe }) }
  );
  if (res.data) return { data: { token: res.data.token, user: normalizeUser(res.data.utilisateur) }, error: res.error, status: res.status };
  return { data: null as null, error: res.error, status: res.status };
}

export async function register(payload: {
  nom: string; prenom: string; email: string; mot_de_passe: string; role: Role; raison_sociale?: string;
}) {
  const res = await apiFetch<{ token: string; utilisateur: Record<string, unknown> }>(
    "/api/auth/inscription",
    {
      method: "POST",
      body: JSON.stringify({
        email: payload.email, nom: payload.nom, prenom: payload.prenom,
        motDePasse: payload.mot_de_passe, typeCompte: payload.role,
        raison_sociale: payload.raison_sociale,
      }),
    }
  );
  if (res.data) return { data: { token: res.data.token, user: normalizeUser(res.data.utilisateur) }, error: res.error, status: res.status };
  return { data: null as null, error: res.error, status: res.status };
}

export async function getMe() {
  const res = await apiFetch<Record<string, unknown>>("/api/auth/profil");
  if (res.data) return { data: normalizeUser(res.data), error: res.error, status: res.status };
  return { data: null as User | null, error: res.error, status: res.status };
}

// ══════════════════════════════════════════════════════════
//  ANNONCES
// ══════════════════════════════════════════════════════════

export async function getAnnonces(params?: SearchParams) {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "" && v !== null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  return apiFetch<{ annonces: Annonce[]; pagination: Pagination }>(`/api/annonces${query}`);
}

export async function getAnnonce(id: number | string) {
  return apiFetch<Annonce>(`/api/annonces/${id}`);
}

export async function getMesAnnonces() {
  return apiFetch<Annonce[]>("/api/annonces/mes-annonces");
}

export async function createAnnonce(form: FormData) {
  return apiUpload<{ message: string; annonce: Annonce }>("/api/annonces", "POST", form);
}

export async function updateAnnonce(id: number, form: FormData) {
  return apiUpload<{ message: string; annonce: Annonce }>(`/api/annonces/${id}`, "PUT", form);
}

export async function deleteAnnonce(id: number) {
  return apiFetch<{ message: string }>(`/api/annonces/${id}`, { method: "DELETE" });
}

export async function deleteAnnonceImage(id: number, imageId: number) {
  return apiFetch<{ message: string }>(`/api/annonces/${id}/images/${imageId}`, { method: "DELETE" });
}

// ══════════════════════════════════════════════════════════
//  RÉSERVATIONS
// ══════════════════════════════════════════════════════════

export async function createReservation(payload: {
  annonce_id: number; dateDebut: string; dateFin: string; nombrePersonnes: number;
}) {
  return apiFetch<{ message: string; reservation: Reservation }>("/api/reservations", {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function getMesReservations() {
  return apiFetch<Reservation[]>("/api/reservations/mes-reservations");
}

export async function getReservationsHote() {
  return apiFetch<Reservation[]>("/api/reservations/hote");
}

export async function updateReservation(id: number, payload: {
  dateDebut?: string; dateFin?: string; nombrePersonnes?: number;
}) {
  return apiFetch<{ message: string; reservation: Reservation }>(`/api/reservations/${id}`, {
    method: "PUT", body: JSON.stringify(payload),
  });
}

export async function refuserReservation(id: number) {
  return apiFetch<{ message: string; reservation: Reservation }>(`/api/reservations/${id}/refuser`, { method: "PUT" });
}

export async function annulerReservation(id: number) {
  return apiFetch<{ message: string; reservation: Reservation }>(`/api/reservations/${id}/annuler`, { method: "PUT" });
}

// ══════════════════════════════════════════════════════════
//  PAIEMENTS
// ══════════════════════════════════════════════════════════

export async function createPaiement(payload: { reservation_id: number; mode_paiement: ModePaiement }) {
  return apiFetch<{ message: string; paiement: { id: number; montant: number }; details: Record<string, unknown> }>(
    "/api/paiements",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function getPaiement(reservationId: number) {
  return apiFetch<{ montant: number; mode_paiement: ModePaiement; statut_reservation: string }>(
    `/api/paiements/reservation/${reservationId}`
  );
}

// ══════════════════════════════════════════════════════════
//  AVIS / ÉVALUATIONS   (montées sur /api/evaluations)
// ══════════════════════════════════════════════════════════

export async function getAvis(annonceId: number | string) {
  return apiFetch<{ avis: AvisItem[]; note_moyenne: number; nb_avis: number }>(
    `/api/evaluations/annonce/${annonceId}`
  );
}

export async function createAvis(payload: { reservation_id: number; note: number; commentaire?: string }) {
  return apiFetch<{ message: string; avis: AvisItem }>("/api/evaluations", {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function getMesAvis() {
  return apiFetch<AvisItem[]>("/api/evaluations/mes-avis");
}
