"use client";
// ============================================================
//  KamerStay — app/host/listings/create/page.tsx
//  Création d'une annonce (multipart : champs + images).
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { createAnnonce } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function CreateListingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useToast();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [prix, setPrix] = useState("");
  const [capacite, setCapacite] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace("/login?redirect=/host/listings/create"); return; }
    if (!isLoading && user && user.role !== "HOTE") { showToast("Espace réservé aux hôtes.", "info"); router.replace("/"); }
  }, [isLoading, isAuthenticated, user, router, showToast]);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []).slice(0, 5);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre || !ville || !prix) { showToast("Titre, ville et prix sont obligatoires.", "error"); return; }
    setSaving(true);
    const form = new FormData();
    form.append("titre", titre);
    form.append("description", description);
    form.append("ville", ville);
    form.append("quartier", quartier);
    form.append("adresse", adresse);
    form.append("prixParNuit", String(prix));
    form.append("capacite", String(capacite));
    files.forEach((f) => form.append("images", f));
    const { error } = await createAnnonce(form);
    setSaving(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Annonce publiée !", "success");
    router.push("/host/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: "104px", paddingBottom: 60 }}>
      <div className="mx-auto px-6" style={{ maxWidth: "720px" }}>
        <Link href="/host/dashboard" className="inline-flex items-center gap-2 mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1A3C2E", textDecoration: "none" }}>
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>
        <h1 className="mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: "#1A3C2E" }}>Nouvelle annonce</h1>

        <form onSubmit={onSubmit} className="rounded-2xl p-7 flex flex-col gap-5" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
          <Field label="Titre de l'annonce *"><input className="lf-input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Suite Panoramique Rainforest" required /></Field>
          <Field label="Description"><textarea className="lf-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre chambre, ses atouts, la vue…" style={{ resize: "vertical" }} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville *"><input className="lf-input" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Limbé" required /></Field>
            <Field label="Quartier"><input className="lf-input" value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Down Beach" /></Field>
          </div>
          <Field label="Adresse"><input className="lf-input" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Rue, repère…" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix par nuit (FCFA) *"><input className="lf-input" type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="45000" required /></Field>
            <Field label="Capacité (personnes) *">
              <div className="flex items-center gap-3" style={{ background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.15)", borderRadius: 10, padding: "8px 12px" }}>
                <button type="button" onClick={() => setCapacite((c) => Math.max(1, c - 1))} className="lf-step">−</button>
                <span className="flex-1 text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{capacite}</span>
                <button type="button" onClick={() => setCapacite((c) => c + 1)} className="lf-step">+</button>
              </div>
            </Field>
          </div>

          <Field label="Photos (jusqu'à 5)">
            <label className="flex items-center gap-3 rounded-xl cursor-pointer" style={{ background: "#F7F3EC", border: "1.5px dashed rgba(26,60,46,0.25)", padding: "16px", justifyContent: "center" }}>
              <ImagePlus size={18} color="#C9943A" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(28,28,28,0.6)" }}>Choisir des images (jpg, png, webp)</span>
              <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
            </label>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(26,60,46,0.1)" }} />
                ))}
              </div>
            )}
          </Field>

          <button type="submit" disabled={saving} style={{ marginTop: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: 10, padding: 14, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 18px rgba(201,148,58,0.35)" }}>
            {saving ? "Publication…" : "Publier l'annonce"}
          </button>
        </form>
      </div>
      <style>{`
        .lf-input { font-family:'DM Sans',sans-serif; font-size:14px; color:#1C1C1C; background:#F7F3EC; border:1px solid rgba(26,60,46,0.15); border-radius:10px; padding:11px 14px; width:100%; outline:none; }
        .lf-step { background:rgba(26,60,46,0.1); border:none; border-radius:6px; width:30px; height:30px; cursor:pointer; font-size:16px; color:#1A3C2E; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#1A3C2E", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      {children}
    </label>
  );
}
