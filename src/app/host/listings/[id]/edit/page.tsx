"use client";
// ============================================================
//  KamerStay — app/host/listings/[id]/edit/page.tsx
//  Modification d'une annonce (champs + statut + ajout d'images).
// ============================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { imageUrl } from "@/lib/images";
import { getAnnonce, updateAnnonce } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const STATUTS = ["DISPONIBLE", "OCCUPEE", "EN_RENOVATION", "SUSPENDUE"];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [prix, setPrix] = useState("");
  const [capacite, setCapacite] = useState(1);
  const [statut, setStatut] = useState("DISPONIBLE");
  const [existing, setExisting] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace(`/login?redirect=/host/listings/${id}/edit`); return; }
    if (!isLoading && user && user.role !== "HOTE") { showToast("Espace réservé aux hôtes.", "info"); router.replace("/"); }
  }, [isLoading, isAuthenticated, user, router, showToast, id]);

  useEffect(() => {
    (async () => {
      const { data } = await getAnnonce(id!);
      if (data) {
        setTitre(data.titre || "");
        setDescription(data.description || "");
        setVille(data.ville || "");
        setQuartier(data.quartier || "");
        setAdresse(data.adresse || "");
        setPrix(String(data.prixparnuit ?? data.prix ?? ""));
        setCapacite(Number(data.capacite ?? 1));
        setStatut(data.statut || "DISPONIBLE");
        setExisting((data.images || []).filter(Boolean));
      }
      setLoading(false);
    })();
  }, [id]);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []).slice(0, 5);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData();
    form.append("titre", titre);
    form.append("description", description);
    form.append("ville", ville);
    form.append("quartier", quartier);
    form.append("adresse", adresse);
    form.append("prixParNuit", String(prix));
    form.append("capacite", String(capacite));
    form.append("statut", statut);
    files.forEach((f) => form.append("images", f));
    const { error } = await updateAnnonce(Number(id), form);
    setSaving(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Annonce mise à jour.", "success");
    router.push("/host/dashboard");
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: 120 }} className="mx-auto px-6 max-w-2xl"><div className="skeleton rounded-2xl" style={{ height: 400 }} /></div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: "104px", paddingBottom: 60 }}>
      <div className="mx-auto px-6" style={{ maxWidth: "720px" }}>
        <Link href="/host/dashboard" className="inline-flex items-center gap-2 mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1A3C2E", textDecoration: "none" }}>
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>
        <h1 className="mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: "#1A3C2E" }}>Modifier l&apos;annonce</h1>

        <form onSubmit={onSubmit} className="rounded-2xl p-7 flex flex-col gap-5" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
          <Field label="Titre de l'annonce"><input className="lf-input" value={titre} onChange={(e) => setTitre(e.target.value)} required /></Field>
          <Field label="Description"><textarea className="lf-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville"><input className="lf-input" value={ville} onChange={(e) => setVille(e.target.value)} required /></Field>
            <Field label="Quartier"><input className="lf-input" value={quartier} onChange={(e) => setQuartier(e.target.value)} /></Field>
          </div>
          <Field label="Adresse"><input className="lf-input" value={adresse} onChange={(e) => setAdresse(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix par nuit (FCFA)"><input className="lf-input" type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)} required /></Field>
            <Field label="Capacité (personnes)">
              <div className="flex items-center gap-3" style={{ background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.15)", borderRadius: 10, padding: "8px 12px" }}>
                <button type="button" onClick={() => setCapacite((c) => Math.max(1, c - 1))} className="lf-step">−</button>
                <span className="flex-1 text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{capacite}</span>
                <button type="button" onClick={() => setCapacite((c) => c + 1)} className="lf-step">+</button>
              </div>
            </Field>
          </div>
          <Field label="Statut / disponibilité">
            <select className="lf-input" value={statut} onChange={(e) => setStatut(e.target.value)} style={{ cursor: "pointer" }}>
              {STATUTS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </Field>

          {existing.length > 0 && (
            <Field label="Photos actuelles">
              <div className="flex gap-2 flex-wrap">
                {existing.map((u, i) => (
                  <ImageWithFallback key={i} src={imageUrl(u)} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(26,60,46,0.1)" }} />
                ))}
              </div>
            </Field>
          )}

          <Field label="Ajouter des photos (jusqu'à 5)">
            <label className="flex items-center gap-3 rounded-xl cursor-pointer" style={{ background: "#F7F3EC", border: "1.5px dashed rgba(26,60,46,0.25)", padding: "16px", justifyContent: "center" }}>
              <ImagePlus size={18} color="#C9943A" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(28,28,28,0.6)" }}>Ajouter des images</span>
              <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
            </label>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previews.map((src, i) => (<img key={i} src={src} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(26,60,46,0.1)" }} />))}
              </div>
            )}
          </Field>

          <button type="submit" disabled={saving} style={{ marginTop: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: 10, padding: 14, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 18px rgba(201,148,58,0.35)" }}>
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
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
