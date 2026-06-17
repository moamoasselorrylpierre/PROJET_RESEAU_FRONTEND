"use client";
// ============================================================
//  KamerStay — components/Navbar.tsx
//  Barre de navigation : transparente en haut de l'accueil,
//  liens conditionnés à la session (CLIENT / HOTE), notifications.
// ============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, MapPin, Bell, LogOut, LayoutDashboard, CalendarCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { signOut } from "@/lib/auth";
import { useSocket } from "@/lib/socket";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Notifications temps réel (toast + compteur)
  useSocket("notifications", (n) => {
    setNotifCount((c) => c + 1);
    showToast(n.message, "info");
  });

  const transparent = isHome && !scrolled;

  async function handleLogout() {
    await signOut();
  }

  const linkColor = "rgba(247,243,236,0.85)";

  // Liens "espace" selon le rôle
  const spaceLink = user?.role === "HOTE"
    ? { href: "/host/dashboard", label: "Espace hôte", Icon: LayoutDashboard }
    : { href: "/reservations", label: "Mes réservations", Icon: CalendarCheck };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: transparent ? "transparent" : "rgba(26, 60, 46, 0.97)",
        backdropFilter: transparent ? "none" : "blur(12px)",
        borderBottom: transparent ? "none" : "1px solid rgba(201,148,58,0.2)",
        boxShadow: transparent ? "none" : "0 4px 30px rgba(0,0,0,0.3)",
      }}
    >
      <div className="mx-auto flex items-center justify-between px-6" style={{ maxWidth: "1440px", height: "72px" }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: "linear-gradient(135deg, #C9943A, #D9A84A)" }}>
            <MapPin size={18} color="#1A3C2E" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 700, color: "#F7F3EC", letterSpacing: "0.02em" }}>
            Kamer<span style={{ color: "#C9943A" }}>Stay</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Hôtels", href: "/search" },
            { label: "Destinations", href: "/search" },
            { label: "À propos", href: "/#about" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="nav-link" style={{ color: linkColor }}>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => { setNotifCount(0); showToast("Aucune nouvelle notification", "info"); }}
                className="relative" title="Notifications"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <Bell size={20} color="#F7F3EC" />
                {notifCount > 0 && (
                  <span style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#C4622D", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {notifCount}
                  </span>
                )}
              </button>
              <Link href={spaceLink.href} className="nav-pill-outline">
                <spaceLink.Icon size={15} /> {spaceLink.label}
              </Link>
              <Link href="/profile" className="nav-pill-outline" title="Mon profil">
                <UserIcon size={15} /> {user.prenom}
              </Link>
              <button onClick={handleLogout} className="nav-pill-gold" title="Déconnexion">
                <LogOut size={15} /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-pill-outline">Connexion</Link>
              <button onClick={() => router.push("/register")} className="nav-pill-gold">S'inscrire →</button>
            </>
          )}
        </div>

        {/* Hamburger mobile */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: "none", border: "none", cursor: "pointer" }}>
          {mobileOpen ? <X size={24} color="#F7F3EC" /> : <Menu size={24} color="#F7F3EC" />}
        </button>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div style={{ background: "rgba(26,60,46,0.98)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(201,148,58,0.2)" }} className="md:hidden px-6 pb-6 pt-4">
          <nav className="flex flex-col gap-3">
            <Link href="/search" onClick={() => setMobileOpen(false)} className="mobile-link">Hôtels</Link>
            <Link href="/#about" onClick={() => setMobileOpen(false)} className="mobile-link">À propos</Link>
            {isAuthenticated && user ? (
              <>
                <Link href={spaceLink.href} onClick={() => setMobileOpen(false)} className="mobile-link">{spaceLink.label}</Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="mobile-link">Mon profil</Link>
                <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="nav-pill-gold" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="mobile-link">Connexion</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="nav-pill-gold" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  S'inscrire
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      <style>{`
        .nav-link { font-family: 'DM Sans', sans-serif; font-size: 15px; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #C9943A !important; }
        .nav-pill-outline {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: #F7F3EC;
          background: none; border: 1px solid rgba(247,243,236,0.35); border-radius: 6px;
          padding: 8px 16px; cursor: pointer; text-decoration: none; transition: all 0.2s;
        }
        .nav-pill-outline:hover { border-color: #C9943A; color: #C9943A; }
        .nav-pill-gold {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #1A3C2E;
          background: linear-gradient(135deg, #C9943A, #D9A84A); border: none; border-radius: 6px;
          padding: 9px 20px; cursor: pointer; text-decoration: none;
          box-shadow: 0 2px 12px rgba(201,148,58,0.35); transition: all 0.2s;
        }
        .nav-pill-gold:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(201,148,58,0.5); }
        .mobile-link {
          font-family: 'DM Sans', sans-serif; font-size: 16px; color: #F7F3EC; text-decoration: none;
          padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
        }
      `}</style>
    </header>
  );
}

export default Navbar;
