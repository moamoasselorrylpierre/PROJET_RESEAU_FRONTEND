"use client";
// ============================================================
//  NidiRoom — app/host/listings/create/page.tsx
//  Créer une nouvelle annonce (HOTE)
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAnnonce, AnnoncePayload } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  // 🔐 Vérification que c'est un HOTE
  if (!user || user.role !== "HOTE") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <p className="text-red-600 mb-4">🔒 Accès réservé aux hôtes</p>
          <Link href="/login" className="text-red-500 hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  // Form state
  const [form, setForm] = useState({
    titre: "",
    description: "",
    ville: "",
    quartier: "",
    adresse: "",
    prix: 0,
    capacite: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // ── Utilitaire pour mettre à jour le form ──
  const updateForm = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErr = { ...prev };
        delete newErr[field];
        return newErr;
      });
    }
  };

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.titre.trim()) newErrors.titre = "Le titre est obligatoire";
    if (!form.ville.trim()) newErrors.ville = "La ville est obligatoire";
    if (form.prix <= 0) newErrors.prix = "Le prix doit être > 0";
    if (form.capacite < 1) newErrors.capacite = "La capacité doit être ≥ 1";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast("Veuillez corriger les erreurs", "error");
      return;
    }

    setLoading(true);

    // Préparer le payload
    const payload: AnnoncePayload = {
      titre: form.titre.trim(),
      ville: form.ville.trim(),
      prix: form.prix,
      capacite: form.capacite,
      ...(form.description.trim() && { description: form.description.trim() }),
      ...(form.quartier.trim() && { quartier: form.quartier.trim() }),
      ...(form.adresse.trim() && { adresse: form.adresse.trim() }),
    };

    console.log("[CreateAnnonce] Envoi:", payload);

    const { data, error } = await createAnnonce(payload);

    if (error) {
      console.error("[CreateAnnonce] Erreur:", error);
      showToast(`❌ ${error}`, "error");
      setLoading(false);
      return;
    }

    console.log("[CreateAnnonce] Succès:", data);
    showToast("✅ Annonce créée avec succès!", "success");

    // Redirection vers la page "mes annonces" du dashboard
    setTimeout(() => {
      router.push("/host/dashboard?tab=annonces");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* ──── HEADER ──── */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">🏠 Publier une chambre</h1>
          <Link
            href="/host/dashboard"
            className="text-gray-600 hover:text-gray-900 underline text-sm"
          >
            ← Retour
          </Link>
        </div>
      </header>

      {/* ──── FORM ──── */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* ── TITRE ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => updateForm("titre", e.target.value)}
              placeholder="Ex: Jolie chambre au centre-ville"
              className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors
                          ${errors.titre ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-red-400"}`}
            />
            {errors.titre && <p className="text-red-500 text-xs mt-1">{errors.titre}</p>}
          </div>

          {/* ── DESCRIPTION ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="Décrivez votre chambre (luminosité, mobilier, équipements...)"
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-red-400 transition-colors"
            />
          </div>

          {/* ── VILLE ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ville <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.ville}
              onChange={(e) => updateForm("ville", e.target.value)}
              placeholder="Ex: Paris"
              className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors
                          ${errors.ville ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-red-400"}`}
            />
            {errors.ville && <p className="text-red-500 text-xs mt-1">{errors.ville}</p>}
          </div>

          {/* ── QUARTIER ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quartier
            </label>
            <input
              type="text"
              value={form.quartier}
              onChange={(e) => updateForm("quartier", e.target.value)}
              placeholder="Ex: Marais"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-red-400 transition-colors"
            />
          </div>

          {/* ── ADRESSE ── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Adresse complète
            </label>
            <input
              type="text"
              value={form.adresse}
              onChange={(e) => updateForm("adresse", e.target.value)}
              placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-red-400 transition-colors"
            />
          </div>

          {/* ── PRIX & CAPACITÉ ── */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prix par nuit (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.prix}
                onChange={(e) => updateForm("prix", parseFloat(e.target.value) || 0)}
                placeholder="Ex: 50"
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors
                            ${errors.prix ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-red-400"}`}
              />
              {errors.prix && <p className="text-red-500 text-xs mt-1">{errors.prix}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Capacité (personnes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.capacite}
                onChange={(e) => updateForm("capacite", parseInt(e.target.value) || 1)}
                placeholder="Ex: 2"
                min="1"
                className={`w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors
                            ${errors.capacite ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-red-400"}`}
              />
              {errors.capacite && <p className="text-red-500 text-xs mt-1">{errors.capacite}</p>}
            </div>
          </div>

          {/* ── BUTTONS ── */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "📤 Publication..." : "✅ Publier l'annonce"}
            </button>
            <Link
              href="/host/dashboard"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl text-center transition-colors"
            >
              ← Annuler
            </Link>
          </div>
        </form>

        {/* ──── INFO SECTION ──── */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Conseil:</strong> Une annonce complète (avec photos, description détaillée) 
            obtient plus de réservations!
          </p>
        </div>
      </main>
    </div>
  );
}
