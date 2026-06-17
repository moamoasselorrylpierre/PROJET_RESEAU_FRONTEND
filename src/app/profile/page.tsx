"use client";
// ============================================================
//  KamerStay — app/profile/page.tsx  (Profil utilisateur)
// ============================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Mail, User as UserIcon, Building2, BadgeCheck, LayoutDashboard, CalendarCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?redirect=/profile");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: 120 }} className="mx-auto px-6 max-w-2xl"><div className="skeleton rounded-2xl" style={{ height: 280 }} /></div>;
  }

  const initials = `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase();
  const isHote = user.role === "HOTE";

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: "104px", paddingBottom: 60 }}>
      <div className="mx-auto px-6" style={{ maxWidth: "720px" }}>
        {/* En-tête */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 4px 24px rgba(26,60,46,0.07)" }}>
          <div style={{ height: 110, background: "linear-gradient(135deg, #1A3C2E, #2A5C44)" }} />
          <div className="px-8 pb-8" style={{ marginTop: -44 }}>
            <div className="flex items-center justify-center rounded-full mb-4" style={{ width: 88, height: 88, background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "4px solid #fff", fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 700, color: "#1A3C2E" }}>{initials}</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 600, color: "#1A3C2E" }}>{user.prenom} {user.nom}</h1>
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ background: "rgba(26,60,46,0.08)", border: "1px solid rgba(201,148,58,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#1A3C2E" }}>
              <BadgeCheck size={14} color="#C9943A" /> {isHote ? "Compte Hôte" : "Compte Voyageur"}
            </span>
          </div>
        </div>

        {/* Détails */}
        <div className="rounded-2xl p-7 mb-6" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
          <h2 className="mb-5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "#1C1C1C" }}>Mes informations</h2>
          <div className="flex flex-col gap-4">
            {[
              { Icon: UserIcon, label: "Nom complet", value: `${user.prenom} ${user.nom}` },
              { Icon: Mail, label: "Email", value: user.email },
              ...(isHote ? [{ Icon: Building2, label: "Raison sociale", value: user.raison_sociale || "—" }] : []),
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#F7F3EC" }}>
                <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: "rgba(26,60,46,0.08)" }}><Icon size={18} color="#1A3C2E" /></div>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#C9943A", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#1C1C1C" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Raccourcis + déconnexion */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={isHote ? "/host/dashboard" : "/reservations"} className="flex-1 flex items-center justify-center gap-2 rounded-xl" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", padding: "14px", textDecoration: "none", boxShadow: "0 4px 16px rgba(201,148,58,0.3)" }}>
            {isHote ? <><LayoutDashboard size={16} /> Espace hôte</> : <><CalendarCheck size={16} /> Mes réservations</>}
          </Link>
          <button onClick={() => signOut()} className="flex-1 flex items-center justify-center gap-2 rounded-xl" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#C4622D", background: "none", border: "2px solid rgba(196,98,45,0.4)", padding: "14px", cursor: "pointer" }}>
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
