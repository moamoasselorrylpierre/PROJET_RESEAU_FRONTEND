"use client";
// ============================================================
//  KamerStay — app/room/[id]/page.tsx  (Détail d'une annonce)
//  Galerie, onglets (description / équipements / avis / localisation),
//  widget de réservation → /booking.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Star, MapPin, Wifi, Wind, Coffee, Waves, Shield, Tv, Droplets,
  Eye, ArrowLeft, ChevronLeft, ChevronRight, Users, Maximize2,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA, annonceToRoom, fallbackRooms, type Room } from "@/data/rooms";
import { getAnnonce, getAvis, type AvisItem } from "@/lib/api";

const allAmenities: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi size={18} />, label: "WiFi haut débit" },
  ac: { icon: <Wind size={18} />, label: "Climatisation" },
  breakfast: { icon: <Coffee size={18} />, label: "Petit-déjeuner inclus" },
  pool: { icon: <Waves size={18} />, label: "Piscine" },
  restaurant: { icon: <span style={{ fontSize: "16px" }}>🍽</span>, label: "Restaurant" },
  security: { icon: <Shield size={18} />, label: "Sécurité 24h" },
  tv: { icon: <Tv size={18} />, label: "Télévision" },
  shower: { icon: <Droplets size={18} />, label: "Eau chaude" },
  view: { icon: <Eye size={18} />, label: "Vue panoramique" },
};

interface DisplayReview { name: string; city: string; rating: number; date: string; text: string }

const staticReviews: DisplayReview[] = [
  { name: "Prisca M.", city: "Yaoundé", rating: 5, date: "Mars 2026", text: "Absolument splendide. Le service était irréprochable et la vue est à couper le souffle. Je reviendrai assurément." },
  { name: "Thomas G.", city: "Paris", rating: 4, date: "Février 2026", text: "Beautiful hotel with great amenities. The staff were incredibly helpful. Breakfast was amazing with local dishes." },
];

export default function RoomDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [reviews, setReviews] = useState<DisplayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "amenities" | "reviews" | "location">("description");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await getAnnonce(id!);
      if (data) {
        setRoom(annonceToRoom(data));
        const avisRes = await getAvis(id!);
        const list = (avisRes.data?.avis || []) as AvisItem[];
        if (list.length) {
          setReviews(list.map((a) => ({
            name: [a.client_prenom, a.client_nom].filter(Boolean).join(" ") || "Client",
            city: "", rating: a.note,
            date: a.dateevaluation ? new Date(a.dateevaluation).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "",
            text: a.commentaire || "—",
          })));
        } else setReviews(staticReviews);
      } else {
        setRoom(fallbackRooms[0]);
        setReviews(staticReviews);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading || !room) {
    return <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: 120 }} className="mx-auto px-6 max-w-5xl">
      <div className="skeleton rounded-2xl" style={{ height: 420 }} />
    </div>;
  }

  const nights = checkin && checkout
    ? Math.max(1, Math.ceil((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 2;
  const amenityList = [...room.amenities, "tv", "shower", "view"].filter((v, i, a) => a.indexOf(v) === i);

  function goBooking() {
    const p = new URLSearchParams({ room: String(room!.id), guests: String(guests) });
    if (checkin) p.set("checkin", checkin);
    if (checkout) p.set("checkout", checkout);
    router.push(`/booking?${p.toString()}`);
  }

  return (
    <div style={{ background: "#F7F3EC", minHeight: "100vh", paddingTop: "72px" }}>
      <div className="mx-auto px-6 pt-6 pb-2" style={{ maxWidth: "1440px" }}>
        <button onClick={() => router.back()} className="flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1A3C2E", background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={16} /> Retour aux résultats
        </button>
      </div>

      {/* Galerie */}
      <div className="mx-auto px-6 pb-8" style={{ maxWidth: "1440px" }}>
        <div className="relative rounded-2xl overflow-hidden mb-3" style={{ height: "480px" }}>
          <ImageWithFallback src={room.images[activeImage]} alt={room.name} className="w-full h-full object-cover" />
          {room.images.length > 1 && (
            <>
              <button onClick={() => setActiveImage((p) => (p - 1 + room.images.length) % room.images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}><ChevronLeft size={22} color="#1A3C2E" /></button>
              <button onClick={() => setActiveImage((p) => (p + 1) % room.images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}><ChevronRight size={22} color="#1A3C2E" /></button>
            </>
          )}
          {room.badge && (<div className="absolute top-5 left-5 px-3 py-1.5 rounded-full" style={{ background: "#C4622D", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>{room.badge}</div>)}
          <div className="absolute bottom-5 right-5 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#fff" }}>{activeImage + 1} / {room.images.length}</div>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {room.images.map((img, i) => (
            <button key={i} onClick={() => setActiveImage(i)} className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 90, height: 64, border: i === activeImage ? "2px solid #C9943A" : "2px solid transparent", cursor: "pointer", padding: 0 }}>
              <ImageWithFallback src={img} alt={`Vue ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="mx-auto px-6 pb-20 flex flex-col lg:flex-row gap-10" style={{ maxWidth: "1440px" }}>
        <div className="flex-1">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "16px", color: "#C9943A" }}>{room.hotel}</span>
              <div className="flex items-center gap-0.5">{[...Array(room.stars)].map((_, i) => (<Star key={i} size={13} fill="#C9943A" color="#C9943A" strokeWidth={0} />))}</div>
            </div>
            <h1 className="mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "48px", fontWeight: 600, color: "#1A3C2E", lineHeight: 1.1 }}>{room.name}</h1>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.55)" }}><MapPin size={15} color="#C4622D" />{room.location}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, #C9943A, #D9A84A)" }}>
                  <Star size={12} fill="#1A3C2E" color="#1A3C2E" />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: "#1A3C2E" }}>{room.rating || "Nouveau"}</span>
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.45)" }}>{room.reviews} avis</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.55)" }}><Users size={14} />{room.guests} personnes</div>
                <div className="flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.55)" }}><Maximize2 size={14} />{room.size} m²</div>
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-0 mb-8 rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", display: "inline-flex" }}>
            {(["description", "amenities", "reviews", "location"] as const).map((tab) => {
              const labels = { description: "Description", amenities: "Équipements", reviews: "Avis", location: "Localisation" };
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "#fff" : "rgba(28,28,28,0.6)", background: activeTab === tab ? "#1A3C2E" : "transparent", border: "none", padding: "10px 20px", cursor: "pointer" }}>{labels[tab]}</button>
              );
            })}
          </div>

          {activeTab === "description" && (
            <div className="rounded-2xl p-8" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.07)" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: "rgba(28,28,28,0.75)", lineHeight: 1.85 }}>{room.description}</p>
            </div>
          )}

          {activeTab === "amenities" && (
            <div className="rounded-2xl p-8" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.07)" }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {amenityList.map((key) => {
                  const a = allAmenities[key]; if (!a) return null;
                  return (
                    <div key={key} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.07)" }}>
                      <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: "rgba(26,60,46,0.08)", color: "#1A3C2E" }}>{a.icon}</div>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1C1C1C" }}>{a.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl p-7 flex gap-8 items-center" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.07)" }}>
                <div className="text-center">
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "56px", fontWeight: 700, color: "#1A3C2E", lineHeight: 1 }}>{room.rating || "—"}</div>
                  <div className="flex justify-center my-2">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} size={16} fill={n <= Math.round(room.rating) ? "#C9943A" : "none"} color="#C9943A" strokeWidth={1.5} style={{ opacity: n <= Math.round(room.rating) ? 1 : 0.3 }} />))}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.45)" }}>{room.reviews} avis</div>
                </div>
              </div>
              {reviews.map((rev, i) => (
                <div key={i} className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.07)", borderLeft: "4px solid #C4622D" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full" style={{ width: 42, height: 42, background: "linear-gradient(135deg, #1A3C2E, #2A5C44)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: "#C9943A" }}>{rev.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                      <div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1C1C1C" }}>{rev.name}</p>
                        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "#C4622D" }}>{[rev.city, rev.date].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} size={13} fill={n <= rev.rating ? "#C9943A" : "none"} color="#C9943A" strokeWidth={1.5} style={{ opacity: n <= rev.rating ? 1 : 0.3 }} />))}</div>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.7)", lineHeight: 1.75, fontStyle: "italic" }}>&ldquo;{rev.text}&rdquo;</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "location" && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(26,60,46,0.08)" }}>
              <div className="relative flex items-center justify-center" style={{ height: "380px", background: "linear-gradient(135deg, #1A3C2E 0%, #2A5C44 50%, #1A3C2E 100%)" }}>
                <div className="relative text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center rounded-full" style={{ width: 56, height: 56, background: "rgba(201,148,58,0.25)", border: "2px solid #C9943A" }}><MapPin size={28} color="#C9943A" /></div>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 600, color: "#F7F3EC" }}>{room.location}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(247,243,236,0.55)", marginTop: "6px" }}>{room.hotel}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Widget réservation */}
        <div className="rounded-2xl p-7 flex-shrink-0" style={{ width: "340px", background: "#fff", border: "1px solid rgba(26,60,46,0.1)", boxShadow: "0 8px 40px rgba(26,60,46,0.1)", height: "fit-content", position: "sticky", top: "100px" }}>
          <div className="flex items-baseline gap-1.5 mb-6">
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 700, color: "#C9943A" }}>{formatFCFA(room.price)}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.45)" }}>/ nuit</span>
          </div>
          <div className="flex flex-col gap-3 mb-4">
            {[{ label: "Arrivée", value: checkin, setter: setCheckin }, { label: "Départ", value: checkout, setter: setCheckout }].map(({ label, value, setter }) => (
              <div key={label}>
                <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700, color: "#C9943A", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>{label}</label>
                <input type="date" value={value} onChange={(e) => setter(e.target.value)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1C1C1C", background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.15)", borderRadius: "8px", padding: "10px 12px", width: "100%", outline: "none" }} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700, color: "#C9943A", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>Voyageurs</label>
              <div className="flex items-center gap-3" style={{ background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.15)", borderRadius: "8px", padding: "8px 12px" }}>
                <button onClick={() => setGuests(Math.max(1, guests - 1))} style={{ background: "rgba(26,60,46,0.1)", border: "none", borderRadius: "4px", width: 28, height: 28, cursor: "pointer", fontSize: "16px", color: "#1A3C2E" }}>−</button>
                <span className="flex-1 text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1C1C1C" }}>{guests} personne{guests > 1 ? "s" : ""}</span>
                <button onClick={() => setGuests(Math.min(room.guests, guests + 1))} style={{ background: "rgba(26,60,46,0.1)", border: "none", borderRadius: "4px", width: 28, height: 28, cursor: "pointer", fontSize: "16px", color: "#1A3C2E" }}>+</button>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 mb-4" style={{ background: "#F7F3EC", border: "1px solid rgba(201,148,58,0.2)" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.6)" }}>{formatFCFA(room.price)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1C1C1C" }}>{formatFCFA(room.price * nights)}</span>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(26,60,46,0.1)" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#1C1C1C" }}>Total</span>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 700, color: "#C9943A" }}>{formatFCFA(room.price * nights)}</span>
            </div>
          </div>
          <button onClick={goBooking} className="w-full mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "10px", padding: "14px", cursor: "pointer", boxShadow: "0 4px 18px rgba(201,148,58,0.35)" }}>Réserver maintenant</button>
          <p className="text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#C4622D", lineHeight: 1.5 }}>✓ Annulation gratuite avant 48h</p>
        </div>
      </div>
    </div>
  );
}
