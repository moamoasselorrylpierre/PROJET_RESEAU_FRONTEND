"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, MapPin, Bell, LogOut, LayoutDashboard, CalendarCheck, User as UserIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { signOut } from "@/lib/auth";
import { useSocket } from "@/lib/socket";
import styles from "./Navbar.module.css";

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

  useSocket("notifications", (n) => {
    setNotifCount((c) => c + 1);
    showToast(n.message, "info");
  });

  const transparent = isHome && !scrolled;

  async function handleLogout() {
    await signOut();
  }

  const linkColor = "rgba(247,243,236,0.85)";

  const spaceLink = user?.role === "ADMINISTRATEUR"
    ? { href: "/admin/dashboard", label: "Espace admin", Icon: ShieldCheck }
    : user?.role === "HOTE"
    ? { href: "/host/dashboard", label: "Espace hôte", Icon: LayoutDashboard }
    : { href: "/reservations", label: "Mes réservations", Icon: CalendarCheck };

  const headerClass = `${styles.header} fixed top-0 left-0 right-0 z-50 ${transparent ? styles.headerTransparent : styles.headerScrolled}`;

  return (
    <header className={headerClass}>
      <div className={`mx-auto flex items-center justify-between px-6 ${styles.container}`}>
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className={`flex items-center justify-center rounded-full ${styles.logoIcon}`}>
            <MapPin size={18} color="#1A3C2E" strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>
            Kamer<span className={styles.logoAccent}>Stay</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Chambres", href: "/search" },
            { label: "Destinations", href: "/destinations" },
            { label: "À propos", href: "/#about" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className={styles.navLink} style={{ color: linkColor }}>
              {item.label}
            </Link>
          ))}
        </nav>

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
                  <span className={styles.notifBadge}>{notifCount}</span>
                )}
              </button>
              <Link href={spaceLink.href} className={styles.pillOutline}>
                <spaceLink.Icon size={15} /> {spaceLink.label}
              </Link>
              <Link href="/profile" className={styles.pillOutline} title="Mon profil">
                <UserIcon size={15} /> {user.prenom}
              </Link>
              <button onClick={handleLogout} className={styles.pillGold} title="Déconnexion">
                <LogOut size={15} /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.pillOutline}>Connexion</Link>
              <button onClick={() => router.push("/register")} className={styles.pillGold}>S'inscrire →</button>
            </>
          )}
        </div>

        <button className={`md:hidden ${styles.hamburgerBtn}`} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} color="#F7F3EC" /> : <Menu size={24} color="#F7F3EC" />}
        </button>
      </div>

      {mobileOpen && (
        <div className={`md:hidden px-6 pb-6 pt-4 ${styles.mobileMenu}`}>
          <nav className="flex flex-col gap-3">
            <Link href="/search" onClick={() => setMobileOpen(false)} className={styles.mobileLink}>Chambres</Link>
            <Link href="/destinations" onClick={() => setMobileOpen(false)} className={styles.mobileLink}>Destinations</Link>
            <Link href="/#about" onClick={() => setMobileOpen(false)} className={styles.mobileLink}>À propos</Link>
            {isAuthenticated && user ? (
              <>
                <Link href={spaceLink.href} onClick={() => setMobileOpen(false)} className={styles.mobileLink}>{spaceLink.label}</Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className={styles.mobileLink}>Mon profil</Link>
                <button onClick={() => { setMobileOpen(false); handleLogout(); }} className={styles.pillGold} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className={styles.mobileLink}>Connexion</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className={styles.pillGold} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  S'inscrire
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;