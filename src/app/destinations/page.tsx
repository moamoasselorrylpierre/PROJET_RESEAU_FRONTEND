"use client";
// ============================================================
//  KamerStay — app/destinations/page.tsx
//  Vue dédiée aux destinations : villes classées par nombre
//  d'hôtes (point 4). Différent de la liste des chambres.
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { destinations } from "@/data/rooms";
import { getVillesPopulaires } from "@/lib/api";

const CITY_IMG_FALLBACK = "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80";
const cityImage = (ville: string): string =>
  destinations.find((d) => d.name.toLowerCase() === ville.toLowerCase())?.image || CITY_IMG_FALLBACK;

interface VilleCard { ville: string; nb_hotes: number; nb_annonces: number; }

export default function DestinationsPage() {
  const router = useRouter();
  const [villes, setVilles] = useState<VilleCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await getVillesPopulaires(50);
      if (data?.length) {
        setVilles(data.map((v) => ({ ville: v.ville, nb_hotes: Number(v.nb_hotes), nb_annonces: Number(v.nb_annonces) })));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ background: "#F7F3EC", minHeight: "100vh" }}>
      <section className="py-16" style={{ background: "#1A3C2E" }}>
        <div className="mx-auto px-6 text-center" style={{ maxWidth: "900px", paddingTop: "60px" }}>
          <p className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Explorer le pays</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(40px, 6vw, 60px)", fontWeight: 600, color: "#F7F3EC", lineHeight: 1.1 }}>Toutes les destinations</h1>
          <p className="mt-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: "rgba(247,243,236,0.7)" }}>Les villes classées par nombre d&apos;hôtes disponibles</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto px-6" style={{ maxWidth: "1440px" }}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (<div key={i} className="skeleton rounded-2xl" style={{ height: 300 }} />))}
            </div>
          ) : villes.length === 0 ? (
            <p className="text-center" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(28,28,28,0.6)" }}>Aucune destination disponible pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {villes.map((v) => (
                <div key={v.ville} onClick={() => router.push(`/search?city=${encodeURIComponent(v.ville)}`)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ height: "300px" }}>
                  <ImageWithFallback src={cityImage(v.ville)} alt={v.ville} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,60,46,0.9) 0%, transparent 60%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="flex items-center gap-1" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "24px", fontWeight: 600, color: "#F7F3EC" }}>
                      <MapPin size={18} />{v.ville}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="px-3 py-1 rounded-full" style={{ background: "rgba(201,148,58,0.25)", border: "1px solid rgba(201,148,58,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#D9A84A" }}>
                        {v.nb_hotes} hôte(s) · {v.nb_annonces} annonce(s)
                      </span>
                      <ArrowRight size={18} color="#D9A84A" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
