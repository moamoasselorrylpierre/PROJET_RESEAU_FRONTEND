// ============================================================
//  KamerStay — data/rooms.ts
//  Type Room (modèle UI de la maquette), helpers d'affichage,
//  données décoratives statiques + mapper Annonce(backend) → Room
// ============================================================

import type { Annonce } from "@/lib/api";
import { imageUrl } from "@/lib/images";

export interface Room {
  id: number;
  name: string;
  hotel: string;
  location: string;
  city: string;
  price: number;
  stars: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  amenities: string[];
  badge?: string | null;
  type: string;
  description: string;
  guests: number;
  size: number;
}

/** Formatte un montant en Franc CFA. */
export function formatFCFA(amount: number): string {
  return Math.round(Number(amount) || 0).toLocaleString("fr-FR") + " FCFA";
}

// Image de secours quand une annonce n'a pas de photo
export const FALLBACK_ROOM_IMAGE =
  "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=1200&q=80";

const DEFAULT_AMENITIES = ["wifi", "ac", "breakfast", "security"];

/** Convertit une annonce du backend vers le modèle Room de l'UI. */
export function annonceToRoom(a: Annonce): Room {
  const prix = Number(a.prix ?? (a as Record<string, unknown>).prixparnuit ?? 0);
  const note = Number(a.note_moyenne ?? 0);
  const imgs = (a.images || []).filter(Boolean).map((u) => imageUrl(u));
  const hotel =
    [a.hote_prenom, a.hote_nom].filter(Boolean).join(" ") ||
    "Hôte KamerStay";

  return {
    id: a.id,
    name: a.titre,
    hotel,
    location: [a.quartier, a.ville].filter(Boolean).join(", ") || a.ville,
    city: a.ville,
    price: prix,
    stars: note >= 4.8 ? 5 : note >= 4 ? 4 : note > 0 ? Math.round(note) : 4,
    rating: note ? Math.round(note * 10) / 10 : 0,
    reviews: Number(a.nb_avis ?? 0),
    image: imgs[0] || FALLBACK_ROOM_IMAGE,
    images: imgs.length ? imgs : [FALLBACK_ROOM_IMAGE],
    amenities: DEFAULT_AMENITIES,
    badge:
      a.disponible === false || (a.statut && a.statut !== "DISPONIBLE")
        ? "Indisponible"
        : null,
    type: "Chambre",
    description: a.description || "Hébergement de qualité au cœur du Cameroun.",
    guests: Number(a.capacite ?? 1),
    size: 30,
  };
}

// ── Données décoratives (sections marketing de l'accueil) ──

export const destinations = [
  { id: 1, name: "Yaoundé",    subtitle: "Capitale politique",   hotels: 42, image: "https://images.unsplash.com/photo-1741991110666-88115e724741?w=600&q=80" },
  { id: 2, name: "Douala",     subtitle: "Capitale économique",  hotels: 67, image: "https://images.unsplash.com/photo-1741991109902-98bf764fb35d?w=600&q=80" },
  { id: 3, name: "Kribi",      subtitle: "Plages paradisiaques", hotels: 28, image: "https://images.unsplash.com/photo-1610987067555-2947ed187d8b?w=600&q=80" },
  { id: 4, name: "Limbé",      subtitle: "Côte volcanique",      hotels: 19, image: "https://images.unsplash.com/photo-1520483601560-389dff434fdf?w=600&q=80" },
  { id: 5, name: "Bafoussam",  subtitle: "Hauts Plateaux",       hotels: 23, image: "https://images.unsplash.com/photo-1628698240719-195c74672c45?w=600&q=80" },
];

export const testimonials = [
  { name: "Amina Kouam", city: "Yaoundé", rating: 5, avatar: "AK", hotel: "Kribi Oceanfront Resort",
    quote: "Une expérience inoubliable à Kribi ! La réservation était simple, le prix était exactement celui affiché et l'hôtel correspondait parfaitement aux photos. Je recommande KamerStay à 100%." },
  { name: "Jean-Baptiste Mbala", city: "Douala", rating: 5, avatar: "JM", hotel: "Douala Business Tower",
    quote: "En tant qu'homme d'affaires qui voyage souvent, j'apprécie le paiement en FCFA et l'assistance locale. L'application est intuitive et le support répond en français. Parfait." },
  { name: "Sophie & Mark T.", city: "Paris", rating: 5, avatar: "SM", hotel: "Bafoussam Nature Lodge",
    quote: "We visited Cameroon for the first time and KamerStay helped us find incredible eco-lodges in Bafoussam. The local knowledge of the team made all the difference. Exceptional!" },
];

// Jeu de chambres statiques — utilisé en repli si le backend est indisponible
export const fallbackRooms: Room[] = [
  { id: -1, name: "Suite Panoramique Rainforest", hotel: "Mont-Cameroun Lodge", location: "Limbé, Sud-Ouest", city: "Limbé", price: 45000, stars: 5, rating: 4.9, reviews: 127,
    image: "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=1200&q=90","https://images.unsplash.com/photo-1765910639954-27ae0c260586?w=1200&q=90"],
    amenities: ["wifi","ac","breakfast","pool","restaurant","security"], badge: "Meilleur choix", type: "Suite",
    description: "Une suite somptueuse avec vue panoramique sur la forêt tropicale et les pentes du Mont Cameroun.", guests: 2, size: 65 },
  { id: -2, name: "Villa Tropicale Prestige", hotel: "Kribi Oceanfront Resort", location: "Kribi, Sud", city: "Kribi", price: 85000, stars: 5, rating: 4.8, reviews: 98,
    image: "https://images.unsplash.com/photo-1777170191230-3f357b815483?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1777170191230-3f357b815483?w=1200&q=90","https://images.unsplash.com/photo-1610987067555-2947ed187d8b?w=1200&q=90"],
    amenities: ["wifi","ac","pool","restaurant","breakfast","security"], badge: "Vue océan", type: "Villa",
    description: "Villa privée avec accès direct à la plage de Kribi, piscine à débordement et service de butler.", guests: 4, size: 120 },
  { id: -3, name: "Chambre Deluxe Jardin", hotel: "Yaoundé Grand Palace", location: "Yaoundé, Centre", city: "Yaoundé", price: 32000, stars: 4, rating: 4.7, reviews: 203,
    image: "https://images.unsplash.com/photo-1766928210443-0be92ed5884a?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1766928210443-0be92ed5884a?w=1200&q=90"],
    amenities: ["wifi","ac","breakfast","restaurant"], badge: null, type: "Chambre",
    description: "Chambre deluxe au cœur de la capitale, décorée avec des touches d'artisanat local.", guests: 2, size: 38 },
];