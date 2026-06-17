// ============================================================
//  KamerStay — lib/auth.ts
//  Gestion de la session JWT et du stockage
//  Utilisé par toutes les pages protégées
// ============================================================

import { User, login, register } from "./api";

// ── Types ──────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
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
  raison_sociale?: string;
}

// ══════════════════════════════════════════════════════════
//  STOCKAGE LOCAL (localStorage)
//  Toutes les fonctions vérifient qu'on est côté client
//  (Next.js fait du SSR — localStorage n'existe pas côté serveur)
// ══════════════════════════════════════════════════════════

/** Sauvegarde le token JWT dans localStorage */
export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

/** Récupère le token JWT */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/** Supprime le token JWT */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

/** Sauvegarde les infos utilisateur */
export function saveUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
}

/** Récupère les infos utilisateur */
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** Supprime les infos utilisateur */
export function removeUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user");
}

/** Retourne l'état complet de la session */
export function getAuthState(): AuthState {
  const token = getToken();
  const user = getUser();
  return {
    token,
    user,
    isAuthenticated: !!token && !!user,
  };
}

// ══════════════════════════════════════════════════════════
//  CONNEXION / INSCRIPTION / DÉCONNEXION
// ══════════════════════════════════════════════════════════

/**
 * Connecte l'utilisateur :
 * 1. Appelle POST /api/auth/connexion
 * 2. Stocke le token + user dans localStorage
 * 3. Retourne { success, error }
 */
export async function signIn(
  email: string,
  mot_de_passe: string
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await login({ email, mot_de_passe });

  if (error || !data) {
    return { success: false, error: error || "Erreur de connexion." };
  }

  saveToken(data.token);
  saveUser(data.user);
  return { success: true, error: null };
}

/**
 * Inscrit un nouvel utilisateur :
 * 1. Appelle POST /api/auth/inscription
 * 2. Stocke le token + user
 * 3. Retourne { success, error }
 */
export async function signUp(
  payload: RegisterPayload
): Promise<{ success: boolean; error: string | null }> {
  const { data, error } = await register(payload);

  if (error || !data) {
    return { success: false, error: error || "Erreur lors de l'inscription." };
  }

  saveToken(data.token);
  saveUser(data.user);
  return { success: true, error: null };
}

/**
 * Déconnecte l'utilisateur :
 * 1. Supprime localStorage
 * 2. Redirige vers /login
 */
export async function signOut(): Promise<void> {
  // Le backend Node n'invalide pas les tokens : on nettoie côté client.
  removeToken();
  removeUser();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// ══════════════════════════════════════════════════════════
//  VÉRIFICATIONS DE RÔLE
// ══════════════════════════════════════════════════════════

/** L'utilisateur connecté est-il un hôte ? */
export function isHote(): boolean {
  const user = getUser();
  return user?.role === "HOTE";
}

/** L'utilisateur connecté est-il un client ? */
export function isClient(): boolean {
  const user = getUser();
  return user?.role === "CLIENT";
}

/** L'utilisateur est-il connecté ? */
export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

// ══════════════════════════════════════════════════════════
//  DÉCODAGE DU TOKEN JWT
//  Utile pour vérifier l'expiration sans appel réseau
// ══════════════════════════════════════════════════════════

interface JWTPayload {
  sub: string;       // email ou id utilisateur
  role: string;
  exp: number;       // timestamp d'expiration
  iat: number;       // timestamp d'émission
}

/**
 * Décode le payload d'un token JWT (sans vérification de signature).
 * La vérification de signature se fait côté backend Spring Security.
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Vérifie si le token JWT stocké est expiré.
 * Retourne true si expiré ou absent.
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  const payload = decodeToken(token);
  if (!payload) return true;

  // exp est en secondes, Date.now() en millisecondes
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Hook utilitaire : vérifie la session et redirige si nécessaire.
 * À appeler au chargement des pages protégées.
 */
export function requireAuth(redirectTo: string = "/login"): boolean {
  if (typeof window === "undefined") return false;

  if (!isAuthenticated() || isTokenExpired()) {
    removeToken();
    removeUser();
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

/**
 * Redirige si l'utilisateur est déjà connecté.
 * À appeler sur les pages /login et /register.
 */
export function redirectIfAuthenticated(redirectTo: string = "/"): void {
  if (typeof window === "undefined") return;
  if (isAuthenticated() && !isTokenExpired()) {
    window.location.href = redirectTo;
  }
}
