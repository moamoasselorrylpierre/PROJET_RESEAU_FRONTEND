"use client";
// ============================================================
//  NidiRoom — app/profile/page.tsx
//  Profil utilisateur : infos, mot de passe, 2FA
// ============================================================

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getMe, User } from "@/lib/api";

type Onglet = "infos" | "securite" | "2fa";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Avatar ──────────────────────────────────────────────────
function Avatar({ user }: { user: User }) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5
                    p-6 bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600
                      text-white flex items-center justify-center text-3xl font-bold
                      flex-shrink-0 shadow-md">
        {user.prenom?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="text-center sm:text-left">
        <h2 className="font-playfair text-2xl font-bold text-gray-900">
          {user.prenom} {user.nom}
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
        <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
          <span className={`text-xs font-bold px-3 py-1 rounded-full
            ${user.role === "HOTE" ? "bg-red-100 text-red-700"
            : user.role === "ADMIN" ? "bg-purple-100 text-purple-700"
            : "bg-blue-100 text-blue-700"}`}>
            {user.role === "HOTE" ? "🏠 Hôte" : user.role === "ADMIN" ? "🛡️ Admin" : "🔍 Locataire"}
          </span>
          {user.twoFactorEnabled && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
              🔐 2FA activée
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Spinner ─────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════
//  PAGE
// ════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, clearSession } = useAuth();
  const { showToast } = useToast();

  const [onglet,  setOnglet]  = useState<Onglet>("infos");
  const [profil,  setProfil]  = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Infos
  const [prenom,      setPrenom]      = useState("");
  const [nom,         setNom]         = useState("");
  const [telephone,   setTelephone]   = useState("");
  const [infosSaving, setInfosSaving] = useState(false);

  // Mot de passe
  const [ancienPwd,  setAncienPwd]  = useState("");
  const [nouveauPwd, setNouveauPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwds,   setShowPwds]   = useState(false);
  const [pwdSaving,  setPwdSaving]  = useState(false);
  const [pwdErrors,  setPwdErrors]  = useState<Record<string,string>>({});

  // 2FA
  const [qrCode,       setQrCode]       = useState<string|null>(null);
  const [secret,       setSecret]       = useState<string|null>(null);
  const [code2FA,      setCode2FA]      = useState("");
  const [twoFAStep,    setTwoFAStep]    = useState<"idle"|"setup">("idle");
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    getMe().then(({ data, error }) => {
      if (error || !data) { showToast("Impossible de charger le profil.", "error"); }
      else {
        setProfil(data);
        setPrenom(data.prenom ?? "");
        setNom(data.nom ?? "");
        setTelephone(data.telephone ?? "");
      }
      setLoading(false);
    });
  }, [isAuthenticated]); // eslint-disable-line

  // ── Sauvegarder infos ───────────────────────────────────
  async function handleSaveInfos(e: FormEvent) {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) { showToast("Prénom et nom requis.", "error"); return; }
    setInfosSaving(true);
    try {
      const res = await fetch(`${API}/api/utilisateurs/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ prenom, nom, telephone }),
      });
      if (!res.ok) throw new Error();
      const updated: User = await res.json();
      setProfil(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      showToast("Profil mis à jour ✅", "success");
    } catch { showToast("Erreur lors de la mise à jour.", "error"); }
    finally { setInfosSaving(false); }
  }

  // ── Changer mot de passe ────────────────────────────────
  function validatePwd(): boolean {
    const e: Record<string,string> = {};
    if (!ancienPwd)                          e.ancien  = "Mot de passe actuel requis.";
    if (!nouveauPwd)                         e.nouveau = "Nouveau mot de passe requis.";
    else if (nouveauPwd.length < 8)          e.nouveau = "Minimum 8 caractères.";
    else if (!/[A-Z]/.test(nouveauPwd))      e.nouveau = "Au moins une majuscule.";
    else if (!/[0-9]/.test(nouveauPwd))      e.nouveau = "Au moins un chiffre.";
    if (!confirmPwd)                         e.confirm = "Confirmation requise.";
    else if (nouveauPwd !== confirmPwd)      e.confirm = "Les mots de passe ne correspondent pas.";
    setPwdErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleChangePwd(e: FormEvent) {
    e.preventDefault();
    if (!validatePwd()) return;
    setPwdSaving(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ancien_mot_de_passe: ancienPwd, nouveau_mot_de_passe: nouveauPwd }),
      });
      if (res.status === 401) { setPwdErrors({ ancien: "Mot de passe actuel incorrect." }); return; }
      if (!res.ok) throw new Error();
      showToast("Mot de passe modifié 🔐", "success");
      setAncienPwd(""); setNouveauPwd(""); setConfirmPwd("");
    } catch { showToast("Erreur lors du changement.", "error"); }
    finally { setPwdSaving(false); }
  }

  // ── 2FA setup ───────────────────────────────────────────
  async function handleSetup2FA() {
    setTwoFALoading(true);
    try {
      const res = await fetch(`${API}/api/auth/2fa/setup`, {
        method: "POST", headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQrCode(data.qr_code_url);
      setSecret(data.secret);
      setTwoFAStep("setup");
    } catch { showToast("Erreur configuration 2FA.", "error"); }
    finally { setTwoFALoading(false); }
  }

  async function handleVerify2FA(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code2FA)) { showToast("Code invalide — 6 chiffres.", "error"); return; }
    setTwoFALoading(true);
    try {
      const res = await fetch(`${API}/api/auth/2fa/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ code: code2FA }),
      });
      if (!res.ok) { showToast("Code incorrect.", "error"); return; }
      setProfil((p) => p ? { ...p, twoFactorEnabled: true } : p);
      setTwoFAStep("idle"); setCode2FA(""); setQrCode(null); setSecret(null);
      showToast("2FA activée avec succès 🔐", "success");
    } catch { showToast("Erreur vérification.", "error"); }
    finally { setTwoFALoading(false); }
  }

  async function handleDisable2FA() {
    if (!window.confirm("Désactiver la 2FA ? Votre compte sera moins sécurisé.")) return;
    setTwoFALoading(true);
    try {
      const res = await fetch(`${API}/api/auth/2fa/disable`, {
        method: "POST", headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error();
      setProfil((p) => p ? { ...p, twoFactorEnabled: false } : p);
      showToast("2FA désactivée.", "success");
    } catch { showToast("Erreur désactivation.", "error"); }
    finally { setTwoFALoading(false); }
  }

  // ── Suppression compte ──────────────────────────────────
  async function handleDeleteAccount() {
    if (!window.confirm("⚠️ Irréversible. Supprimer votre compte ?")) return;
    try {
      const res = await fetch(`${API}/api/utilisateurs/me`, {
        method: "DELETE", headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error();
      await clearSession();
      showToast("Compte supprimé.", "success");
      router.push("/");
    } catch { showToast("Erreur suppression compte.", "error"); }
  }

  // ── Squelette ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <div className="h-10 skeleton rounded w-48" />
        <div className="h-32 skeleton rounded-2xl" />
        <div className="h-10 skeleton rounded-2xl w-72" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }
  if (!profil) return null;

  // ── Rendu ───────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900 mb-6">
        Mon profil
      </h1>

      <Avatar user={profil} />

      {/* Onglets */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit mb-6">
        {([
          { key: "infos",    label: "👤 Informations" },
          { key: "securite", label: "🔒 Mot de passe"  },
          { key: "2fa",      label: "🔐 2FA"            },
        ] as { key: Onglet; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setOnglet(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
              ${onglet === key ? "bg-red-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            {label}
            {key === "2fa" && profil.twoFactorEnabled && (
              <span className="ml-1.5 w-2 h-2 bg-green-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* ══ INFOS ══ */}
      {onglet === "infos" && (
        <form onSubmit={handleSaveInfos}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-gray-800 text-lg">Informations personnelles</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prénom</label>
              <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none
                           focus:border-red-400 transition-colors text-gray-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
              <input type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none
                           focus:border-red-400 transition-colors text-gray-800" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email <span className="text-gray-400 font-normal">(non modifiable)</span>
            </label>
            <input type="email" value={profil.email} disabled
              className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none
                         focus:border-red-400 transition-colors text-gray-800 placeholder-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rôle</label>
            <div className="px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500">
              {profil.role === "HOTE" ? "🏠 Hôte" : profil.role === "ADMIN" ? "🛡️ Administrateur" : "🔍 Locataire"}
            </div>
          </div>

          <button type="submit" disabled={infosSaving}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300
                       disabled:cursor-not-allowed text-white font-bold py-3
                       rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            {infosSaving ? <><Spinner />Sauvegarde…</> : "Sauvegarder les modifications"}
          </button>
        </form>
      )}

      {/* ══ SÉCURITÉ ══ */}
      {onglet === "securite" && (
        <div className="space-y-6">
          <form onSubmit={handleChangePwd}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-gray-800 text-lg">Changer le mot de passe</h2>

            {[
              { label: "Mot de passe actuel",          val: ancienPwd,  setVal: setAncienPwd,  err: pwdErrors.ancien  },
              { label: "Nouveau mot de passe",         val: nouveauPwd, setVal: setNouveauPwd, err: pwdErrors.nouveau },
              { label: "Confirmer le nouveau",         val: confirmPwd, setVal: setConfirmPwd, err: pwdErrors.confirm,
                border: confirmPwd && confirmPwd === nouveauPwd ? "border-green-400" : undefined },
            ].map(({ label, val, setVal, err, border }) => (
              <div key={label}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input type={showPwds ? "text" : "password"} value={val}
                    onChange={(e) => setVal(e.target.value)} placeholder="••••••••"
                    className={`w-full px-4 py-3 pr-12 border rounded-xl text-sm outline-none
                                transition-colors text-gray-800 placeholder-gray-300
                                ${err ? "border-red-400" : border ?? "border-gray-200 focus:border-red-400"}`} />
                  <button type="button" onClick={() => setShowPwds(!showPwds)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwds ? "🙈" : "👁️"}
                  </button>
                </div>
                {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
              </div>
            ))}

            <button type="submit" disabled={pwdSaving}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed
                         text-white font-bold py-3 rounded-xl transition-colors text-sm
                         flex items-center justify-center gap-2">
              {pwdSaving ? <><Spinner />Modification…</> : "Changer le mot de passe"}
            </button>
          </form>

          {/* Zone danger */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h3 className="font-bold text-red-800 mb-1">Zone de danger</h3>
            <p className="text-red-600 text-sm mb-4">
              La suppression est irréversible. Toutes vos données seront effacées définitivement.
            </p>
            <button onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Supprimer mon compte
            </button>
          </div>
        </div>
      )}

      {/* ══ 2FA ══ */}
      {onglet === "2fa" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="font-bold text-gray-800 text-lg mb-1">Authentification à deux facteurs (2FA)</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Renforcez la sécurité de votre compte. À chaque connexion, vous devrez saisir un code
              généré par Google Authenticator ou Authy.
            </p>
          </div>

          {/* Statut */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border
            ${profil.twoFactorEnabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-3xl">{profil.twoFactorEnabled ? "🔐" : "🔓"}</span>
            <div>
              <p className={`font-bold text-sm ${profil.twoFactorEnabled ? "text-green-800" : "text-gray-700"}`}>
                {profil.twoFactorEnabled ? "2FA activée" : "2FA non activée"}
              </p>
              <p className={`text-xs mt-0.5 ${profil.twoFactorEnabled ? "text-green-600" : "text-gray-500"}`}>
                {profil.twoFactorEnabled
                  ? "Votre compte est protégé par une seconde vérification."
                  : "Activez la 2FA pour renforcer la sécurité de votre compte."}
              </p>
            </div>
          </div>

          {/* Activation */}
          {!profil.twoFactorEnabled && twoFAStep === "idle" && (
            <button onClick={handleSetup2FA} disabled={twoFALoading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed
                         text-white font-bold py-3 rounded-xl text-sm transition-colors
                         flex items-center justify-center gap-2">
              {twoFALoading ? <><Spinner />Génération du QR code…</> : "🔐 Activer la 2FA"}
            </button>
          )}

          {/* Setup QR */}
          {twoFAStep === "setup" && qrCode && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">📱 Étape 1 — Scannez le QR code</p>
                <p className="text-xs text-blue-600">
                  Ouvrez Google Authenticator ou Authy et scannez le code ci-dessous.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                  <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              </div>
              {secret && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Clé manuelle
                  </p>
                  <code className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-2 rounded-lg block text-center break-all select-all">
                    {secret}
                  </code>
                </div>
              )}
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    📱 Étape 2 — Code généré (6 chiffres)
                  </label>
                  <input type="text" inputMode="numeric" maxLength={6}
                    value={code2FA}
                    onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000" autoFocus
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl text-center
                               text-2xl font-bold tracking-[0.5em] outline-none
                               focus:border-red-400 transition-colors text-gray-800 placeholder-gray-200" />
                </div>
                <button type="submit" disabled={twoFALoading || code2FA.length !== 6}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300
                             disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl
                             text-sm transition-colors flex items-center justify-center gap-2">
                  {twoFALoading ? <><Spinner />Vérification…</> : "✅ Confirmer et activer la 2FA"}
                </button>
                <button type="button"
                  onClick={() => { setTwoFAStep("idle"); setQrCode(null); setSecret(null); setCode2FA(""); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors">
                  Annuler
                </button>
              </form>
            </div>
          )}

          {/* Déjà activée */}
          {profil.twoFactorEnabled && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-700">
                  ✅ Compte protégé. Un code vous sera demandé à chaque connexion.
                </p>
              </div>
              <button onClick={handleDisable2FA} disabled={twoFALoading}
                className="w-full border-2 border-red-200 hover:bg-red-50 text-red-600 font-bold
                           py-3 rounded-xl text-sm transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2">
                {twoFALoading ? <><Spinner />Désactivation…</> : "Désactiver la 2FA"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
