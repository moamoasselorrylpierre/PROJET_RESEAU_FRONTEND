"use client";
// ============================================================
//  KamerStay — app/search/page.tsx  (Recherche + filtres)
//  Récupère les annonces du backend et filtre côté client.
// ============================================================

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SlidersHorizontal, Star, Wifi, Wind, Coffee, Waves, Shield, MapPin, X,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA, annonceToRoom, fallbackRooms, type Room } from "@/data/rooms";
import { getAnnonces } from "@/lib/api";

const amenityLabels: Record<string, string> = {
  wifi: "WiFi", ac: "Climatisation", breakfast: "Petit-déjeuner", pool: "Piscine", restaurant: "Restaurant", security: "Sécurité 24h",
};
const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi size={14} />, ac: <Wind size={14} />, breakfast: <Coffee size={14} />,
  pool: <Waves size={14} />, restaurant: <span style={{ fontSize: "12px" }}>🍽</span>, security: <Shield size={14} />,
};
const hotelTypes = ["Hôtel", "Auberge", "Villa", "Lodge", "Bungalow"];

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city") || "";

  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxPrice, setMaxPrice] = useState(150000);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recommended");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await getAnnonces({ ville: cityParam || undefined, limit: 50 });
      if (data?.annonces?.length) setAllRooms(data.annonces.map(annonceToRoom));
      else setAllRooms(cityParam ? [] : fallbackRooms);
      setLoading(false);
    })();
  }, [cityParam]);

  const filtered = useMemo(() => {
    let list = allRooms.filter((r) => {
      if (r.price > maxPrice) return false;
      if (selectedStars.length > 0 && !selectedStars.includes(r.stars)) return false;
      if (selectedAmenities.length > 0 && !selectedAmenities.every((a) => r.amenities.includes(a))) return false;
      return true;
    });
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [allRooms, maxPrice, selectedStars, selectedAmenities, sortBy]);

  const toggleStar = (n: number) => setSelectedStars((p) => p.includes(n) ? p.filter((s) => s !== n) : [...p, n]);
  const toggleAmenity = (a: string) => setSelectedAmenities((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);

  const titleH4: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: "#1C1C1C", textTransform: "uppercase", letterSpacing: "0.06em" };

  const FilterPanel = () => (
    <div>
      <div className="mb-8">
        <h4 className="mb-4" style={titleH4}>Prix par nuit</h4>
        <div className="flex justify-between mb-3">
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.5)" }}>0 FCFA</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, color: "#C9943A" }}>{formatFCFA(maxPrice)}</span>
        </div>
        <input type="range" min={10000} max={150000} step={5000} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full" style={{ accentColor: "#C9943A", cursor: "pointer" }} />
      </div>

      <div className="mb-8">
        <h4 className="mb-4" style={titleH4}>Type d&apos;hébergement</h4>
        <div className="flex flex-col gap-2.5">
          {hotelTypes.map((type) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => setSelectedTypes((p) => p.includes(type) ? p.filter((t) => t !== type) : [...p, type])} style={{ accentColor: "#1A3C2E", width: 16, height: 16 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.75)" }}>{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h4 className="mb-4" style={titleH4}>Étoiles</h4>
        <div className="flex flex-col gap-2.5">
          {[5, 4, 3].map((n) => (
            <label key={n} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selectedStars.includes(n)} onChange={() => toggleStar(n)} style={{ accentColor: "#1A3C2E", width: 16, height: 16 }} />
              <div className="flex items-center gap-1">{[...Array(n)].map((_, i) => (<Star key={i} size={14} fill="#C9943A" color="#C9943A" strokeWidth={0} />))}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="mb-4" style={titleH4}>Équipements</h4>
        <div className="flex flex-col gap-2.5">
          {Object.keys(amenityLabels).map((a) => (
            <label key={a} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={selectedAmenities.includes(a)} onChange={() => toggleAmenity(a)} style={{ accentColor: "#1A3C2E", width: 16, height: 16 }} />
              <span className="flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.75)" }}>{amenityIcons[a]}{amenityLabels[a]}</span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={() => { setMaxPrice(150000); setSelectedTypes([]); setSelectedStars([]); setSelectedAmenities([]); }}
        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#C4622D", background: "none", border: "1px solid rgba(196,98,45,0.3)", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", width: "100%", marginTop: "8px" }}>
        Réinitialiser les filtres
      </button>
    </div>
  );

  return (
    <div style={{ background: "#F7F3EC", minHeight: "100vh", paddingTop: "72px" }}>
      {/* Bandeau */}
      <div style={{ background: "#1A3C2E", padding: "28px 0" }}>
        <div className="mx-auto px-6 flex items-center justify-between flex-wrap gap-4" style={{ maxWidth: "1440px" }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 600, color: "#F7F3EC" }}>
              {cityParam ? `Hôtels à ${cityParam}` : "Tous les hébergements"}
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(247,243,236,0.6)", marginTop: "4px" }}>
              {loading ? "Chargement…" : `${filtered.length} résultat${filtered.length > 1 ? "s" : ""} trouvé${filtered.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(201,148,58,0.35)", borderRadius: "8px", color: "#F7F3EC", padding: "9px 14px", cursor: "pointer", outline: "none" }}>
              <option value="recommended" style={{ background: "#1A3C2E" }}>Recommandé</option>
              <option value="price_asc" style={{ background: "#1A3C2E" }}>Prix croissant</option>
              <option value="price_desc" style={{ background: "#1A3C2E" }}>Prix décroissant</option>
              <option value="rating" style={{ background: "#1A3C2E" }}>Mieux notés</option>
            </select>
            <button className="md:hidden flex items-center gap-2" onClick={() => setMobileFiltersOpen(true)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "8px", padding: "9px 16px", cursor: "pointer" }}>
              <SlidersHorizontal size={16} /> Filtres
            </button>
          </div>
        </div>
      </div>

      {/* Drawer mobile */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="ml-auto w-80 h-full overflow-y-auto p-6" style={{ background: "#fff" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#1A3C2E" }}>Filtres</h3>
              <button onClick={() => setMobileFiltersOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} color="#1C1C1C" /></button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}

      <div className="mx-auto px-6 py-10" style={{ maxWidth: "1440px" }}>
        <div className="flex gap-8">
          <aside className="hidden md:block flex-shrink-0 rounded-2xl p-7" style={{ width: "280px", background: "#fff", border: "1px solid rgba(26,60,46,0.08)", height: "fit-content", position: "sticky", top: "100px" }}>
            <div className="flex items-center gap-2 mb-7">
              <SlidersHorizontal size={18} color="#1A3C2E" />
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "#1C1C1C" }}>Filtres</h3>
            </div>
            <FilterPanel />
          </aside>

          <div className="flex-1">
            {loading ? (
              <div className="flex flex-col gap-5">{[...Array(3)].map((_, i) => (<div key={i} className="skeleton rounded-2xl" style={{ height: 200 }} />))}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 600, color: "#1A3C2E", marginBottom: "12px" }}>Aucun résultat</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "rgba(28,28,28,0.5)" }}>Essayez d&apos;ajuster vos filtres ou une autre ville.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {filtered.map((room) => (
                  <div key={room.id} className="rounded-2xl overflow-hidden flex flex-col md:flex-row" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 2px 16px rgba(26,60,46,0.06)" }}>
                    <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "280px", minHeight: "200px" }}>
                      <ImageWithFallback src={room.image} alt={room.name} className="w-full h-full object-cover" style={{ minHeight: "200px" }} />
                      {room.badge && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full" style={{ background: "#C4622D", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>{room.badge}</div>
                      )}
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-start justify-between mb-1">
                        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "#C9943A" }}>{room.hotel}</span>
                        <div className="flex items-center gap-1">{[...Array(room.stars)].map((_, i) => (<Star key={i} size={12} fill="#C9943A" color="#C9943A" strokeWidth={0} />))}</div>
                      </div>
                      <h3 className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 700, color: "#1C1C1C" }}>{room.name}</h3>
                      <div className="flex items-center gap-1 mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.5)" }}><MapPin size={13} />{room.location}</div>
                      <p className="mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.6)", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{room.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {room.amenities.map((a) => (<span key={a} className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(26,60,46,0.06)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(28,28,28,0.65)" }}>{amenityIcons[a]}{amenityLabels[a]}</span>))}
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(26,60,46,0.07)" }}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #C9943A, #D9A84A)" }}>
                            <Star size={12} fill="#1A3C2E" color="#1A3C2E" />
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: "#1A3C2E" }}>{room.rating || "—"}</span>
                          </div>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.45)" }}>{room.reviews} avis</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: "#C9943A", lineHeight: 1 }}>{formatFCFA(room.price)}</div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(28,28,28,0.4)", marginTop: "2px" }}>par nuit</div>
                          </div>
                          <button onClick={() => router.push(`/room/${room.id}`)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "8px", padding: "10px 22px", cursor: "pointer", boxShadow: "0 3px 12px rgba(201,148,58,0.3)", whiteSpace: "nowrap" }}>Voir & réserver</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F7F3EC" }} />}>
      <SearchInner />
    </Suspense>
  );
}
