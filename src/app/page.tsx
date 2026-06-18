"use client";
// ============================================================
//  KamerStay — app/page.tsx  (Accueil)
//  Hero + recherche, destinations, annonces (backend), atouts,
//  témoignages, newsletter.
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wifi, Wind, Coffee, Waves, Star, ChevronDown,
  Shield, RefreshCw, BadgePercent, Headphones, ArrowRight, MapPin,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import {
  destinations, testimonials, formatFCFA, fallbackRooms, annonceToRoom, type Room,
} from "@/data/rooms";
import { getAnnonces, getVillesPopulaires } from "@/lib/api";

// Image par défaut + lookup d'images de villes (réutilise les visuels marketing).
const CITY_IMG_FALLBACK = "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&q=80";
const cityImage = (ville: string): string =>
  destinations.find((d) => d.name.toLowerCase() === ville.toLowerCase())?.image || CITY_IMG_FALLBACK;

interface DestinationCard { name: string; subtitle: string; hotels: number; image: string; }

const HERO_IMG = "https://images.unsplash.com/photo-1765910639954-27ae0c260586?w=1920&q=90";

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size}
          fill={n <= Math.round(rating) ? "#C9943A" : "none"} color="#C9943A"
          strokeWidth={1.5} style={{ opacity: n <= Math.round(rating) ? 1 : 0.3 }} />
      ))}
    </div>
  );
}

function AmenityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    wifi: <Wifi size={14} />, ac: <Wind size={14} />, breakfast: <Coffee size={14} />,
    pool: <Waves size={14} />, restaurant: <span style={{ fontSize: "12px" }}>🍽</span>, security: <Shield size={14} />,
  };
  const labels: Record<string, string> = {
    wifi: "WiFi", ac: "Clim", breakfast: "Petit-déj", pool: "Piscine", restaurant: "Restaurant", security: "Sécurité",
  };
  return (
    <span className="flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(28,28,28,0.6)", background: "rgba(26,60,46,0.07)", padding: "3px 8px", borderRadius: "20px" }}>
      {icons[type]}{labels[type]}
    </span>
  );
}

function RoomCard({ room }: { room: Room }) {
  const router = useRouter();
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 4px 24px rgba(26,60,46,0.08)", transition: "transform 0.3s, box-shadow 0.3s" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(26,60,46,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(26,60,46,0.08)"; }}>
      <div className="relative overflow-hidden" style={{ height: "220px" }}>
        <ImageWithFallback src={room.image} alt={room.name} className="w-full h-full object-cover transition-transform duration-500" />
        {room.badge && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full" style={{ background: "#C4622D", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {room.badge}
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#fff" }}>
          <Star size={11} fill="#C9943A" color="#C9943A" />{room.rating || "—"}
        </div>
      </div>
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between mb-1">
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "#C9943A" }}>{room.hotel}</span>
          <div className="flex items-center gap-1">
            {[...Array(room.stars)].map((_, i) => (<Star key={i} size={11} fill="#C9943A" color="#C9943A" strokeWidth={0} />))}
          </div>
        </div>
        <h3 className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, color: "#1C1C1C" }}>{room.name}</h3>
        <div className="flex items-center gap-1 mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.5)" }}>
          <MapPin size={12} />{room.location}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {room.amenities.slice(0, 4).map((a) => (<AmenityIcon key={a} type={a} />))}
        </div>
        <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: "1px solid rgba(26,60,46,0.07)" }}>
          <div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: "#C9943A" }}>{formatFCFA(room.price)}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.45)" }}> / nuit</span>
          </div>
          <button onClick={() => router.push(`/room/${room.id}`)}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "6px", padding: "8px 18px", cursor: "pointer", boxShadow: "0 2px 8px rgba(201,148,58,0.3)" }}>
            Voir & réserver
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroSearchBar() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: "14px", background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(201,148,58,0.3)", borderRadius: "8px", color: "#F7F3EC", outline: "none",
    width: "100%", padding: "10px 14px",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#C9943A",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", display: "block",
  };

  function submit() {
    const p = new URLSearchParams();
    if (destination) p.set("city", destination);
    if (guests) p.set("guests", String(guests));
    if (checkin) p.set("checkin", checkin);
    if (checkout) p.set("checkout", checkout);
    router.push(`/search?${p.toString()}`);
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label style={labelStyle}>Destination</label>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="" style={{ background: "#1A3C2E" }}>Choisir une ville...</option>
            {["Yaoundé", "Douala", "Kribi", "Limbé", "Bafoussam", "Ngaoundéré", "Garoua"].map((c) => (
              <option key={c} value={c} style={{ background: "#1A3C2E" }}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Arrivée</label>
          <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
        </div>
        <div>
          <label style={labelStyle}>Départ</label>
          <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
        </div>
        <div>
          <label style={labelStyle}>Voyageurs</label>
          <div className="flex items-center gap-2" style={{ ...inputStyle, display: "flex", alignItems: "center", padding: "6px 14px" }}>
            <button onClick={() => setGuests(Math.max(1, guests - 1))} style={{ background: "rgba(201,148,58,0.3)", border: "none", color: "#F7F3EC", borderRadius: "4px", width: "26px", height: "26px", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>−</button>
            <span className="flex-1 text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "#F7F3EC" }}>{guests}</span>
            <button onClick={() => setGuests(Math.min(10, guests + 1))} style={{ background: "rgba(201,148,58,0.3)", border: "none", color: "#F7F3EC", borderRadius: "4px", width: "26px", height: "26px", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>+</button>
          </div>
        </div>
      </div>
      <button onClick={submit} className="w-full"
        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "8px", padding: "14px", cursor: "pointer", letterSpacing: "0.02em", boxShadow: "0 4px 20px rgba(201,148,58,0.4)" }}>
        Rechercher un hébergement →
      </button>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);
  const [topVilles, setTopVilles] = useState<DestinationCard[]>(
    destinations.map((d) => ({ name: d.name, subtitle: d.subtitle, hotels: d.hotels, image: d.image }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Hébergements en vedette = les mieux notés (point 7)
      const { data } = await getAnnonces({ limit: 6, tri: "populaire" });
      if (data?.annonces?.length) setDisplayRooms(data.annonces.map(annonceToRoom));
      else setDisplayRooms(fallbackRooms);
      setLoading(false);
    })();

    // Destinations phares = villes avec le plus d'hôtes (point 3)
    (async () => {
      const { data } = await getVillesPopulaires(8);
      if (data?.length) {
        setTopVilles(
          data.map((v) => ({
            name: v.ville,
            subtitle: `${Number(v.nb_hotes)} hôte(s)`,
            hotels: Number(v.nb_annonces),
            image: cityImage(v.ville),
          }))
        );
      }
    })();
  }, []);

  return (
    <div style={{ background: "#F7F3EC", overflowX: "hidden" }}>
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center" style={{ minHeight: "100vh" }}>
        <div className="absolute inset-0">
          <ImageWithFallback src={HERO_IMG} alt="Resort de luxe au Cameroun" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(26,60,46,0.55) 0%, rgba(26,60,46,0.45) 50%, rgba(26,60,46,0.75) 100%)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full" style={{ maxWidth: "900px", paddingTop: "120px", paddingBottom: "60px" }}>
          <div className="mb-6 px-5 py-2 rounded-full" style={{ border: "1px solid rgba(201,148,58,0.6)", background: "rgba(201,148,58,0.12)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#D9A84A", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            ✦ Bienvenue au Cameroun ✦
          </div>
          <h1 className="mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(52px, 8vw, 88px)", fontWeight: 600, color: "#F7F3EC", lineHeight: 1.05, letterSpacing: "-0.01em" }}>
            Discover Cameroon,<br /><em>One Room at a Time</em>
          </h1>
          <p className="mb-12" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", color: "rgba(247,243,236,0.78)", lineHeight: 1.6, maxWidth: "500px" }}>
            Luxe, confort & âme locale — <span style={{ color: "#D9A84A", fontWeight: 500 }}>à partir de 15 000 FCFA/nuit</span>
          </p>
          <div className="w-full rounded-2xl p-6" style={{ maxWidth: "820px", background: "rgba(26,60,46,0.45)", backdropFilter: "blur(24px)", border: "1px solid rgba(201,148,58,0.35)", boxShadow: "0 16px 60px rgba(0,0,0,0.3)" }}>
            <HeroSearchBar />
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ animation: "bounce-cue 2s infinite" }}>
          <ChevronDown size={22} color="rgba(247,243,236,0.5)" />
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="py-20" style={{ background: "#fff" }}>
        <div className="mx-auto px-6" style={{ maxWidth: "1440px" }}>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Explorer le pays</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px", fontWeight: 600, color: "#1A3C2E", lineHeight: 1.1 }}>Destinations phares</h2>
            </div>
            <button onClick={() => router.push("/destinations")} className="hidden md:flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A3C2E", background: "none", border: "none", cursor: "pointer" }}>
              Voir tout <ArrowRight size={16} />
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
            {topVilles.map((dest) => (
              <div key={dest.name} onClick={() => router.push(`/search?city=${encodeURIComponent(dest.name)}`)} className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer" style={{ width: "240px", height: "320px" }}>
                <ImageWithFallback src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,60,46,0.88) 0%, transparent 55%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "22px", fontWeight: 600, color: "#F7F3EC", lineHeight: 1.2 }}>{dest.name}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(247,243,236,0.65)", marginTop: "2px" }}>{dest.subtitle}</p>
                  <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full" style={{ background: "rgba(201,148,58,0.25)", border: "1px solid rgba(201,148,58,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#D9A84A" }}>
                    {dest.hotels} annonce(s)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANNONCES */}
      <section className="py-20" style={{ background: "#F7F3EC" }}>
        <div className="mx-auto px-6" style={{ maxWidth: "1440px" }}>
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Sélection premium</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px", fontWeight: 600, color: "#1A3C2E", lineHeight: 1.1 }}>Hébergements en vedette</h2>
            </div>
            <button onClick={() => router.push("/search")} className="hidden md:flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A3C2E", background: "none", border: "none", cursor: "pointer" }}>
              Tous les hôtels <ArrowRight size={16} />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {[...Array(3)].map((_, i) => (<div key={i} className="skeleton rounded-2xl" style={{ height: 420 }} />))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {displayRooms.map((room) => (<RoomCard key={room.id} room={room} />))}
            </div>
          )}
        </div>
      </section>

      {/* POURQUOI NOUS */}
      <section className="py-20" style={{ background: "#fff" }}>
        <div className="mx-auto px-6" style={{ maxWidth: "1440px" }}>
          <div className="text-center mb-14">
            <p className="mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Pourquoi nous choisir</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px", fontWeight: 600, color: "#1A3C2E" }}>L&apos;excellence à chaque réservation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Paiement sécurisé", desc: "Mobile Money (MTN, Orange) & carte bancaire acceptés en toute sécurité." },
              { icon: RefreshCw, title: "Annulation flexible", desc: "Annulation gratuite jusqu'à 48h avant votre arrivée, sans frais." },
              { icon: BadgePercent, title: "Prix garantis FCFA", desc: "Aucune surprise de change. Tous vos prix sont affichés et débités en FCFA." },
              { icon: Headphones, title: "Support local 24/7", desc: "Une équipe camerounaise disponible à toute heure pour vous assister." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="text-center p-8 rounded-2xl" style={{ background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.07)" }}>
                <div className="mx-auto mb-5 flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: "linear-gradient(135deg, rgba(26,60,46,0.08), rgba(201,148,58,0.12))", border: "1px solid rgba(201,148,58,0.25)" }}>
                  <Icon size={26} color="#1A3C2E" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "#1C1C1C" }}>{title}</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.6)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="py-20" style={{ background: "#F7F3EC" }}>
        <div className="mx-auto px-6" style={{ maxWidth: "1440px" }}>
          <div className="text-center mb-14">
            <p className="mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Ce que disent nos clients</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px", fontWeight: 600, color: "#1A3C2E" }}>Avis vérifiés</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {testimonials.map((t, i) => (
              <div key={i} className="p-7 rounded-2xl" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", borderLeft: "4px solid #C4622D", boxShadow: "0 2px 20px rgba(26,60,46,0.06)" }}>
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 46, height: 46, background: "linear-gradient(135deg, #1A3C2E, #2A5C44)", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#C9943A" }}>{t.avatar}</div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1C1C1C" }}>{t.name}</p>
                    <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "#C4622D" }}>{t.city} · {t.hotel}</p>
                  </div>
                </div>
                <StarRating rating={t.rating} size={15} />
                <p className="mt-4" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.7)", lineHeight: 1.75, fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="relative py-20 overflow-hidden" style={{ background: "#1A3C2E" }}>
        <div className="absolute top-0 left-0 right-0" style={{ height: "5px", background: "repeating-linear-gradient(90deg, #C9943A 0px, #C9943A 16px, #F7F3EC 16px, #F7F3EC 32px, #C4622D 32px, #C4622D 48px, #F7F3EC 48px, #F7F3EC 64px)" }} />
        <div className="relative z-10 mx-auto px-6 text-center" style={{ maxWidth: "640px" }}>
          <p className="mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "rgba(201,148,58,0.8)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Newsletter</p>
          <h2 className="mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 600, color: "#C9943A", lineHeight: 1.15 }}>
            Partez à la découverte<br /><em style={{ color: "#F7F3EC" }}>du Cameroun</em>
          </h2>
          <p className="mb-10" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: "rgba(247,243,236,0.65)", lineHeight: 1.65 }}>
            Recevez nos meilleures offres, nouvelles destinations et bons plans en avant-première.
          </p>
          <div className="flex gap-3 max-w-md mx-auto">
            <input type="email" placeholder="votre@email.com" style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "#F7F3EC", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(201,148,58,0.35)", borderRadius: "8px", padding: "12px 18px", outline: "none" }} />
            <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "8px", padding: "12px 24px", cursor: "pointer", whiteSpace: "nowrap" }}>S&apos;inscrire</button></div>
</div>
</section>
</div>
  )}
