// ============================================================
//  KamerStay — lib/images.ts
//  Construit l'URL complète d'une image servie par le backend
//  (le backend stocke des chemins relatifs type "uploads/images/xxx.jpg")
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Retourne une URL d'image affichable (absolue ou préfixée par le backend). */
export function imageUrl(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;          // déjà absolue (Unsplash…)
  const path = url.startsWith("/") ? url : `/${url}`; // chemin servi par Express
  return `${BASE_URL}${path}`;
}
