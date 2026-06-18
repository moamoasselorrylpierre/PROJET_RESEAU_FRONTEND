"use client";
// ============================================================
//  KamerStay — app/host/listings/create/page.tsx
//  Création d'une annonce (multipart : champs + images).
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { createAnnonce, getEquipements, type Equipement } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "../host-listings.module.css";

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
  const [superficie, setSuperficie] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace("/login?redirect=/host/listings/create"); return; }
    if (!isLoading && user && user.role !== "HOTE") { showToast("Espace réservé aux hôtes.", "info"); router.replace("/"); }
  }, [isLoading, isAuthenticated, user, router, showToast]);

  useEffect(() => {
    (async () => {
      const { data } = await getEquipements();
      if (data) setEquipements(data);
    })();
  }, []);

  const toggleEquip = (code: string) =>
    setSelectedEquip((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []).slice(0, 5);
    setFiles(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre || !ville || !prix) { showToast("Titre, ville et prix sont obligatoires.", "error"); return; }
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
    if (superficie) form.append("superficie", String(superficie));
    if (dateDebut) form.append("date_debut_validite", dateDebut);
    if (dateFin) form.append("date_fin_validite", dateFin);
    form.append("equipements", JSON.stringify(selectedEquip));
    files.forEach((f) => form.append("images", f));
    const { error } = await createAnnonce(form);
    setSaving(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Annonce publiée !", "success");
    router.push("/host/dashboard");
  }

  return (
    <div className={styles.pageWrap}>
      <div className={`${styles.container} mx-auto px-6`}>
        <Link href="/host/dashboard" className={`${styles.backLink} inline-flex items-center gap-2 mb-4`}>
          <ArrowLeft size={16} /> Retour au tableau de bord
        </Link>
        <h1 className={`${styles.pageTitle} mb-8`}>Nouvelle annonce</h1>

        <form onSubmit={onSubmit} className={`${styles.formCard} rounded-2xl p-7 flex flex-col gap-5`}>
          <Field label="Titre de l'annonce *"><input className={styles.input} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Suite Panoramique Rainforest" required /></Field>
          <Field label="Description"><textarea className={`${styles.input} ${styles.textarea}`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre chambre, ses atouts, la vue…" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville *"><input className={styles.input} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Limbé" required /></Field>
            <Field label="Quartier"><input className={styles.input} value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Down Beach" /></Field>
          </div>
          <Field label="Adresse"><input className={styles.input} value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Rue, repère…" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix par nuit (FCFA) *"><input className={styles.input} type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="45000" required /></Field>
            <Field label="Capacité (personnes) *">
              <div className={`${styles.stepper} flex items-center gap-3`}>
                <button type="button" onClick={() => setCapacite((c) => Math.max(1, c - 1))} className={styles.stepBtn}>−</button>
                <span className={`${styles.stepValue} flex-1 text-center`}>{capacite}</span>
                <button type="button" onClick={() => setCapacite((c) => c + 1)} className={styles.stepBtn}>+</button>
              </div>
            </Field>
          </div>

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

          <Field label="Photos (jusqu'à 5)">
            <label className={`${styles.uploader} flex items-center gap-3 rounded-xl cursor-pointer`}>
              <ImagePlus size={18} color="#C9943A" />
              <span className={styles.uploaderText}>Choisir des images (jpg, png, webp)</span>
              <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
            </label>
            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className={styles.previewImg} />
                ))}
              </div>
            )}
          </Field>

          <button type="submit" disabled={saving} className={styles.submitBtn}>
            {saving ? "Publication…" : "Publier l'annonce"}
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
