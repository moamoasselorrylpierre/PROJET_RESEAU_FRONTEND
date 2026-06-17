"use client";
// ============================================================
//  KamerStay — components/Footer.tsx
// ============================================================

import Link from "next/link";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer style={{ background: "#1C1C1C", borderTop: "1px solid rgba(201,148,58,0.25)" }}>
      {/* Bande kente */}
      <div
        style={{
          height: "4px",
          background:
            "repeating-linear-gradient(90deg, #C9943A 0px, #C9943A 12px, #1A3C2E 12px, #1A3C2E 24px, #C4622D 24px, #C4622D 36px, #1A3C2E 36px, #1A3C2E 48px)",
        }}
      />

      <div className="mx-auto px-6 py-16" style={{ maxWidth: "1440px" }}>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Logo & tagline */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "linear-gradient(135deg, #C9943A, #D9A84A)" }}
              >
                <MapPin size={18} color="#1A3C2E" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 700, color: "#F7F3EC" }}>
                Kamer<span style={{ color: "#C9943A" }}>Stay</span>
              </span>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(247,243,236,0.55)", lineHeight: 1.7, marginBottom: "24px" }}>
              La référence de la réservation hôtelière au Cameroun. Luxe, authenticité et prix garantis en FCFA.
            </p>
            <div className="flex gap-3">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <span
                  key={i}
                  style={{
                    width: 38, height: 38, borderRadius: "8px",
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon size={16} color="rgba(247,243,236,0.7)" />
                </span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="footer-title">Navigation</h4>
            {[
              { label: "Accueil", href: "/" },
              { label: "Rechercher", href: "/search" },
              { label: "Nos hôtels", href: "/search" },
              { label: "Espace hôte", href: "/host/dashboard" },
              { label: "Mes réservations", href: "/reservations" },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <Link href={item.href} className="footer-link">{item.label}</Link>
              </div>
            ))}
          </div>

          {/* Destinations */}
          <div>
            <h4 className="footer-title">Destinations</h4>
            {["Yaoundé", "Douala", "Kribi", "Limbé", "Bafoussam", "Ngaoundéré", "Garoua", "Bertoua"].map((city) => (
              <div key={city} className="mb-3">
                <Link href={`/search?city=${encodeURIComponent(city)}`} className="footer-link">{city}</Link>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 className="footer-title">Contact</h4>
            <div className="flex flex-col gap-4">
              {[
                { Icon: MapPin, text: "Rue du Lac Vert, Yaoundé, Cameroun" },
                { Icon: Phone, text: "+237 699 000 111" },
                { Icon: Mail, text: "support@kamerstay.cm" },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Icon size={16} color="#C9943A" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(247,243,236,0.6)", lineHeight: 1.5 }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bas de page */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-10 mt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(247,243,236,0.35)" }}>
            © {new Date().getFullYear()} KamerStay. Tous droits réservés. —{" "}
            <span style={{ color: "#C9943A" }}>Tous les prix affichés en Franc CFA (FCFA)</span>
          </p>
          <div className="flex gap-6">
            {["Confidentialité", "Conditions", "Cookies"].map((item) => (
              <span key={item} className="footer-link" style={{ fontSize: "13px" }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .footer-title {
          font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 600;
          color: #C9943A; margin-bottom: 20px; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .footer-link {
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(247,243,236,0.6);
          cursor: pointer; transition: color 0.2s; text-decoration: none;
        }
        .footer-link:hover { color: #C9943A; }
      `}</style>
    </footer>
  );
}

export default Footer;
