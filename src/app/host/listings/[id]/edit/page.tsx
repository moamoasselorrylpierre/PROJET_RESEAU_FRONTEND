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
import { getAnnonce, updateAnnonce, getEquipements, type Equipement } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "../../host-listings.module.css";

const STATUTS = ["DISPONIBLE", "OCCUPEE", "EN_RENOVATION", "SUSPENDUE"];
const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

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
  const [superficie, setSuperficie] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<string[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleEquip = (code: string) =>
    setSelectedEquip((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace(`/login?redirect=/host/listings/${id}/edit`); return; }
    if (!isLoading && user && user.role !== "HOTE") { showToast("Espace réservé aux hôtes.", "info"); router.replace("/"); }
  }, [isLoading, isAuthenticated, user, router, showToast, id]);

  useEffect(() => {
    (async () => {
      const [{ data }, equipRes] = await Promise.all([getAnnonce(id!), getEquipements()]);
      if (equipRes.data) setEquipements(equipRes.data);
      if (data) {
        setTitre(data.titre || "");
        setDescription(data.description || "");
        setVille(data.ville || "");
        setQuartier(data.quartier || "");
        setAdresse(data.adresse || "");
        setPrix(String(data.prixparnuit ?? data.prix ?? ""));
        setCapacite(Number(data.capacite ?? 1));
        setStatut(data.statut || "DISPONIBLE");
        setSuperficie(data.superficie != null ? String(data.superficie) : "");
        setDateDebut(toDateInput(data.date_debut_validite));
        setDateFin(toDateInput(data.date_fin_validite));
        setSelectedEquip((data.equipements || []).filter(Boolean));
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
    if ((dateDebut && !dateFin) || (!dateDebut && dateFin)) {
      showToast("Renseignez les deux dates de validité, ou aucune.", "error"); return;
    }
    if (dateDebut && dateFin && dateFin < dateDebut) {
      showToast("La date de fin de validité doit suivre la date de début.", "error"); return;
    }
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
    form.append("superficie", superficie);
    form.append("date_debut_validite", dateDebut);
    form.append("date_fin_validite", dateFin);
    form.append("equipements", JSON.stringify(selectedEquip));
    files.forEach((f) => form.append("images", f));
    const { error } = await updateAnnonce(Number(id), form);
    setSaving(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Annonce mise à jour.", "success");
    router.push("/host/dashboard");
  }

  if (loading) {
    return (
      <div className={styles.pageWrap} style={{ paddingTop: 120 }}>
        <div className="mx-auto px-6 max-w-2xl">
          <div className={`${styles.skeleton} skeleton rounded-2xl`} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      <div className={`${styles.container} mx-auto px-6`}>
        <Link href="/host/dashboard" className={`${styles.backLink} inline-flex items-center gap-2 mb-4`}>
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>
        <h1 className={`${styles.pageTitle} mb-8`}>Modifier l&apos;annonce</h1>

        <form onSubmit={onSubmit} className={`${styles.formCard} rounded-2xl p-7 flex flex-col gap-5`}>
          <Field label="Titre de l'annonce"><input className={styles.input} value={titre} onChange={(e) => setTitre(e.target.value)} required /></Field>
          <Field label="Description"><textarea className={`${styles.input} ${styles.textarea}`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville"><input className={styles.input} value={ville} onChange={(e) => setVille(e.target.value)} required /></Field>
            <Field label="Quartier"><input className={styles.input} value={quartier} onChange={(e) => setQuartier(e.target.value)} /></Field>
          </div>
          <Field label="Adresse"><input className={styles.input} value={adresse} onChange={(e) => setAdresse(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix par nuit (FCFA)"><input className={styles.input} type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)} required /></Field>
            <Field label="Capacité (personnes)">
              <div className={`${styles.stepper} flex items-center gap-3`}>
                <button type="button" onClick={() => setCapacite((c) => Math.max(1, c - 1))} className={styles.stepBtn}>−</button>
                <span className={`${styles.stepValue} flex-1 text-center`}>{capacite}</span>
                <button type="button" onClick={() => setCapacite((c) => c + 1)} className={styles.stepBtn}>+</button>
              </div>
            </Field>
          </div>
          <Field label="Statut / disponibilité">
            <select className={`${styles.input} ${styles.select}`} value={statut} onChange={(e) => setStatut(e.target.value)}>
              {STATUTS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Superficie (m²) — optionnel"><input className={styles.input} type="number" min={0} value={superficie} onChange={(e) => setSuperficie(e.target.value)} placeholder="30" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Disponible du (optionnel)"><input className={styles.input} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} /></Field>
            <Field label="Disponible jusqu'au (optionnel)"><input className={styles.input} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} /></Field>
          </div>

          {equipements.length > 0 && (
            <Field label="Équipements">
              <div className="flex flex-wrap gap-2.5">
                {equipements.map((eq) => (
                  <label key={eq.code} className="flex items-center gap-2 cursor-pointer" style={{ border: "1px solid rgba(26,60,46,0.15)", borderRadius: "20px", padding: "6px 12px", background: selectedEquip.includes(eq.code) ? "rgba(201,148,58,0.18)" : "transparent" }}>
                    <input type="checkbox" checked={selectedEquip.includes(eq.code)} onChange={() => toggleEquip(eq.code)} />
                    <span className={styles.fieldLabel}>{eq.nom}</span>
                  </label>
                ))}
              </div>
            </Field>
          )}

          {existing.length > 0 && (
            <Field label="Photos actuelles">
              <div className="flex gap-2 flex-wrap">
                {existing.map((u, i) => (
                  <ImageWithFallback key={i} src={imageUrl(u)} alt="" className={styles.previewImg} />
                ))}
              </div>
            </Field>
          )}

          <Field label="Ajouter des photos (jusqu'à 5)">
            <label className={`${styles.uploader} flex items-center gap-3 rounded-xl cursor-pointer`}>
              <ImagePlus size={18} color="#C9943A" />
              <span className={styles.uploaderText}>Ajouter des images</span>
              <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
            </label>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previews.map((src, i) => (<img key={i} src={src} alt="" className={styles.previewImg} />))}
              </div>
            )}
          </Field>

          <button type="submit" disabled={saving} className={styles.submitBtn}>
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
