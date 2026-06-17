"use client";
// ============================================================
//  KamerStay — app/login/page.tsx  (Connexion)
// ============================================================

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Mail, Lock } from "lucide-react";
import { login } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { setSession } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await login({ email, mot_de_passe: motDePasse });
    setLoading(false);
    if (error || !data) { showToast(error || "Connexion impossible.", "error"); return; }
    setSession(data.token, data.user);
    showToast(`Bienvenue, ${data.user.prenom} !`, "success");
    const redirect = sp.get("redirect");
    router.push(redirect || (data.user.role === "HOTE" ? "/host/dashboard" : "/"));
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1A3C2E 0%, #2A5C44 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 20px 40px" }}>
      <div className="w-full" style={{ maxWidth: "440px", background: "#fff", borderRadius: "20px", padding: "40px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: "linear-gradient(135deg, #C9943A, #D9A84A)" }}><MapPin size={20} color="#1A3C2E" strokeWidth={2.5} /></div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 700, color: "#1A3C2E" }}>Kamer<span style={{ color: "#C9943A" }}>Stay</span></span>
        </div>
        <h1 className="text-center mb-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "34px", fontWeight: 600, color: "#1A3C2E" }}>Bon retour</h1>
        <p className="text-center mb-8" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.55)" }}>Connectez-vous pour réserver votre séjour.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <div className="auth-input-wrap"><Mail size={16} color="#C9943A" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" /></div>
          </label>
          <label className="auth-field">
            <span className="auth-label">Mot de passe</span>
            <div className="auth-input-wrap"><Lock size={16} color="#C9943A" /><input type="password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="••••••••" /></div>
          </label>
          <button type="submit" disabled={loading} style={{ marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: 10, padding: 14, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 18px rgba(201,148,58,0.35)" }}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center mt-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "rgba(28,28,28,0.6)" }}>
          Pas encore de compte ? <Link href="/register" style={{ color: "#C9943A", fontWeight: 600, textDecoration: "none" }}>Créer un compte</Link>
        </p>
      </div>
      <style>{`
        .auth-field { display:flex; flex-direction:column; gap:6px; }
        .auth-label { font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; color:#1A3C2E; text-transform:uppercase; letter-spacing:0.06em; }
        .auth-input-wrap { display:flex; align-items:center; gap:8px; background:#F7F3EC; border:1px solid rgba(26,60,46,0.15); border-radius:10px; padding:11px 14px; }
        .auth-input-wrap input { flex:1; border:none; outline:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:14px; color:#1C1C1C; }
        .auth-input-wrap select { flex:1; border:none; outline:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:14px; color:#1C1C1C; cursor:pointer; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", background: "#1A3C2E" }} />}><LoginInner /></Suspense>;
}
