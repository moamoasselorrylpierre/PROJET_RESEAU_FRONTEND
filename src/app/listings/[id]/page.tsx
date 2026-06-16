"use client";
// ============================================================
//  NidiRoom — app/listings/[id]/page.tsx
//  Détail d'une annonce : infos, galerie, avis, réservation
// ============================================================

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAnnonce, getAvis, createAvis, createReservation,
  Annonce, Avis,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

// ══════════════════════════════════════════════════════════
//  UTILITAIRES
// ══════════════════════════════════════════════════════════

function diffJours(debut: string, fin: string): number {
  const d1 = new Date(debut).getTime();
  const d2 = new Date(fin).getTime();
  return Math.max(1, Math.ceil((d2 - d1) / 86400000));
}

function dateMin(): string {
  return new Date().toISOString().split("T")[0];
}

// ══════════════════════════════════════════════════════════
//  COMPOSANT ÉTOILES
// ══════════════════════════════════════════════════════════

function StarRating({
  value, onChange, readonly = false,
}: {
  value: number; onChange?: (n: number) => void; readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-2xl transition-transform
                      ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}
                      ${(hover || value) >= star ? "text-yellow-400" : "text-gray-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  COMPOSANT CARTE AVIS
// ══════════════════════════════════════════════════════════

function AvisCard({ avis }: { avis: Avis }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500 text-white flex
                          items-center justify-center font-bold text-sm flex-shrink-0">
            {avis.auteur?.prenom?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {avis.auteur?.prenom} {avis.auteur?.nom}
            </p>
            <p className="text-gray-400 text-xs">
              {new Date(avis.created_at).toLocaleDateString("fr-FR", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        </div>
        <StarRating value={avis.note} readonly />
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{avis.commentaire}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════

export default function ListingDetailPage() {
  const { id }         = useParams<{ id: string }>();
  const router         = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast }  = useToast();

  // ── Données ────────────────────────────────────────────
  const [annonce,  setAnnonce]  = useState<Annonce | null>(null);
  const [avis,     setAvis]     = useState<Avis[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── Galerie ────────────────────────────────────────────
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // ── Réservation ────────────────────────────────────────
  const [dateDebut,   setDateDebut]   = useState("");
  const [dateFin,     setDateFin]     = useState("");
  const [resLoading,  setResLoading]  = useState(false);

  // ── Avis ───────────────────────────────────────────────
  const [note,          setNote]          = useState(5);
  const [commentaire,   setCommentaire]   = useState("");
  const [avisLoading,   setAvisLoading]   = useState(false);
  const [showAvisForm,  setShowAvisForm]  = useState(false);

  // ── Chargement initial ─────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [resAnnonce, resAvis] = await Promise.all([
        getAnnonce(Number(id)),
        getAvis(Number(id)),
      ]);
      if (resAnnonce.error || !resAnnonce.data) {
        showToast("Annonce introuvable.", "error");
        router.push("/listings");
        return;
      }
      setAnnonce(resAnnonce.data);
      setAvis(resAvis.data ?? []);
      setLoading(false);
    }
    load();
  }, [id]); // eslint-disable-line

  // ── Toutes les photos ──────────────────────────────────
  const photos = annonce?.images ?? [];

  // ── Montant total calculé ──────────────────────────────
  const nuits = dateDebut && dateFin ? diffJours(dateDebut, dateFin) : 0;
  const montantTotal = nuits * (annonce?.prix ?? 0);

  // ══════════════════════════════════════════════════════
  //  SOUMISSION RÉSERVATION
  // ══════════════════════════════════════════════════════

  async function handleReservation(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast("Connectez-vous pour réserver.", "warning");
      router.push("/login");
      return;
    }
    if (!dateDebut || !dateFin) {
      showToast("Veuillez choisir vos dates.", "warning");
      return;
    }
    if (new Date(dateFin) <= new Date(dateDebut)) {
      showToast("La date de départ doit être après la date d'arrivée.", "error");
      return;
    }

    setResLoading(true);
    const { data, error } = await createReservation({
      annonce_id:  Number(id),
      date_debut:  dateDebut,
      date_fin:    dateFin,
    });
    setResLoading(false);

    if (error || !data) {
      showToast(error || "Erreur lors de la réservation.", "error");
      return;
    }
    showToast("Demande de réservation envoyée ! 🎉", "success", 5000);
    router.push("/reservations");
  }

  // ══════════════════════════════════════════════════════
  //  SOUMISSION AVIS
  // ══════════════════════════════════════════════════════

  async function handleAvis(e: FormEvent) {
    e.preventDefault();
    if (!commentaire.trim()) {
      showToast("Veuillez écrire un commentaire.", "warning");
      return;
    }

    setAvisLoading(true);
    const { data, error } = await createAvis({ annonce_id: Number(id), note, commentaire });
    setAvisLoading(false);

    if (error || !data) {
      showToast(error || "Erreur lors de l'envoi de l'avis.", "error");
      return;
    }
    setAvis((prev) => [data, ...prev]);
    setCommentaire("");
    setNote(5);
    setShowAvisForm(false);
    showToast("Votre avis a été publié. ⭐", "success");
  }

  // ══════════════════════════════════════════════════════
  //  SQUELETTE CHARGEMENT
  // ══════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6 animate-pulse">
        <div className="h-8 skeleton rounded w-1/2" />
        <div className="h-[420px] skeleton rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-4 skeleton rounded w-full" />
            <div className="h-4 skeleton rounded w-2/3" />
          </div>
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!annonce) return null;

  // ══════════════════════════════════════════════════════
  //  RENDU PRINCIPAL
  // ══════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

      {/* ── FIL D'ARIANE ── */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
        <span>/</span>
        <Link href="/listings" className="hover:text-gray-600 transition-colors">Annonces</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{annonce.titre}</span>
      </nav>

      {/* ── TITRE & MÉTA ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {annonce.titre}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>📍 {annonce.ville}</span>
            {annonce.note_moyenne && (
              <span className="flex items-center gap-1">
                ⭐ {parseFloat(String(annonce.note_moyenne)).toFixed(1)}
                <span className="text-gray-400">
                  ({annonce.nombre_avis} avis)
                </span>
              </span>
            )}
            <span>👤 {annonce.capacite} personne{annonce.capacite > 1 ? "s" : ""}</span>
            {annonce.superficie && <span>📐 {annonce.superficie} m²</span>}
          </div>
        </div>
        {/* Badge disponibilité */}
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold
                          ${annonce.disponible
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"}`}>
          {annonce.disponible ? "✅ Disponible" : "❌ Indisponible"}
        </span>
      </div>

      {/* ── GALERIE PHOTOS ── */}
      {photos.length > 0 ? (
        <div className="mb-10">
          {/* Photo principale */}
          <div
            className="relative h-[420px] rounded-2xl overflow-hidden cursor-pointer
                       bg-gray-100 group mb-3"
            onClick={() => setLightbox(true)}
          >
            <img
              src={photos[photoIdx]}
              alt={annonce.titre}
              className="w-full h-full object-cover group-hover:scale-[1.02]
                         transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                            transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity
                               bg-white/90 text-gray-800 text-sm font-semibold
                               px-4 py-2 rounded-full">
                🔍 Agrandir
              </span>
            </div>
            {/* Compteur */}
            <span className="absolute bottom-4 right-4 bg-black/60 text-white
                             text-xs px-3 py-1.5 rounded-full">
              {photoIdx + 1} / {photos.length}
            </span>
          </div>

          {/* Miniatures */}
          {photos.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden
                              border-2 transition-all
                              ${i === photoIdx
                                ? "border-red-500 scale-105"
                                : "border-transparent hover:border-gray-300"}`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-[300px] rounded-2xl bg-gradient-to-br from-red-50
                        to-orange-50 flex items-center justify-center text-7xl mb-10">
          🏠
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center
                     justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl
                       hover:text-gray-300 transition-colors"
            onClick={() => setLightbox(false)}
          >
            ✕
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); }}
                className="absolute left-4 text-white text-4xl hover:text-gray-300
                           transition-colors bg-black/40 w-12 h-12 rounded-full
                           flex items-center justify-center"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % photos.length); }}
                className="absolute right-16 text-white text-4xl hover:text-gray-300
                           transition-colors bg-black/40 w-12 h-12 rounded-full
                           flex items-center justify-center"
              >
                ›
              </button>
            </>
          )}
          <img
            src={photos[photoIdx]}
            alt={annonce.titre}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── CORPS : INFO + RÉSERVATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── COLONNE GAUCHE : Infos ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Hôte */}
          {annonce.hote && (
            <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl
                            border border-gray-100">
              <div className="w-14 h-14 rounded-full bg-red-500 text-white flex
                              items-center justify-center font-bold text-xl flex-shrink-0">
                {annonce.hote.prenom?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                  Proposé par
                </p>
                <p className="font-bold text-gray-900 text-lg">
                  {annonce.hote.prenom} {annonce.hote.nom}
                </p>
                {annonce.hote.telephone && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    📞 {annonce.hote.telephone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-4">
              Description
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {annonce.description}
            </p>
          </div>

          {/* Caractéristiques */}
          <div>
            <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-4">
              Caractéristiques
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: "👤", label: "Capacité",   value: `${annonce.capacite} personne${annonce.capacite > 1 ? "s" : ""}` },
                { icon: "📍", label: "Ville",      value: annonce.ville },
                { icon: "📐", label: "Superficie", value: annonce.superficie ? `${annonce.superficie} m²` : "N/A" },
                { icon: "💰", label: "Prix/nuit",  value: `${Number(annonce.prix_par_nuit).toLocaleString("fr-FR")} FCFA` },
                { icon: "⭐", label: "Note moy.",  value: annonce.note_moyenne ? parseFloat(String(annonce.note_moyenne)).toFixed(1) + " / 5" : "Aucun avis" },
                { icon: "📅", label: "Avis",       value: `${annonce.nombre_avis ?? 0} avis` },
              ].map((item) => (
                <div key={item.label}
                     className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xl mb-2">{item.icon}</p>
                  <p className="text-xs text-gray-400 font-medium uppercase
                                tracking-wide mb-1">{item.label}</p>
                  <p className="font-semibold text-gray-800 text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Localisation */}
          {annonce.adresse && (
            <div>
              <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-3">
                Localisation
              </h2>
              <p className="text-gray-600 flex items-center gap-2 text-sm">
                📍 {annonce.adresse}, {annonce.ville}
              </p>
            </div>
          )}

          {/* ── SECTION AVIS ── */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-playfair text-2xl font-bold text-gray-900">
                Avis ({avis.length})
              </h2>
              {isAuthenticated && user?.role !== "HOTE" && (
                <button
                  onClick={() => setShowAvisForm(!showAvisForm)}
                  className="text-sm font-semibold text-red-500 hover:text-red-600
                             border border-red-200 px-4 py-2 rounded-full
                             transition-colors"
                >
                  {showAvisForm ? "Annuler" : "✏️ Laisser un avis"}
                </button>
              )}
            </div>

            {/* Formulaire avis */}
            {showAvisForm && (
              <form
                onSubmit={handleAvis}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6"
              >
                <h3 className="font-semibold text-gray-800 mb-4">
                  Votre évaluation
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Note
                  </label>
                  <StarRating value={note} onChange={setNote} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Commentaire
                  </label>
                  <textarea
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Partagez votre expérience…"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl
                               text-sm outline-none focus:border-red-400
                               transition-colors resize-none text-gray-800
                               placeholder-gray-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={avisLoading}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300
                             text-white font-bold px-6 py-2.5 rounded-xl
                             text-sm transition-colors"
                >
                  {avisLoading ? "Publication…" : "Publier l'avis"}
                </button>
              </form>
            )}

            {/* Liste des avis */}
            {avis.length > 0 ? (
              <div className="space-y-4">
                {avis.map((a) => <AvisCard key={a.id} avis={a} />)}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-2xl
                              border border-gray-100">
                <p className="text-3xl mb-2">⭐</p>
                <p className="text-gray-500 text-sm">
                  Aucun avis pour le moment. Soyez le premier !
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── COLONNE DROITE : Réservation ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">

              {/* Prix */}
              <div className="mb-6">
                <p className="font-bold text-gray-900 text-2xl">
                  {Number(annonce.prix_par_nuit).toLocaleString("fr-FR")}
                  <span className="text-gray-400 font-normal text-base"> FCFA</span>
                  <span className="text-gray-400 font-normal text-sm"> /nuit</span>
                </p>
                {annonce.note_moyenne && (
                  <p className="text-sm text-gray-400 mt-1">
                    ⭐ {parseFloat(String(annonce.note_moyenne)).toFixed(1)}
                    · {annonce.nombre_avis} avis
                  </p>
                )}
              </div>

              {annonce.disponible ? (
                <form onSubmit={handleReservation} className="space-y-4">

                  {/* Dates */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-gray-200">
                      <div className="p-3">
                        <label className="block text-xs font-bold text-gray-500
                                          uppercase tracking-wide mb-1">
                          Arrivée
                        </label>
                        <input
                          type="date"
                          value={dateDebut}
                          min={dateMin()}
                          onChange={(e) => setDateDebut(e.target.value)}
                          className="w-full text-sm text-gray-800 outline-none
                                     bg-transparent"
                        />
                      </div>
                      <div className="p-3">
                        <label className="block text-xs font-bold text-gray-500
                                          uppercase tracking-wide mb-1">
                          Départ
                        </label>
                        <input
                          type="date"
                          value={dateFin}
                          min={dateDebut || dateMin()}
                          onChange={(e) => setDateFin(e.target.value)}
                          className="w-full text-sm text-gray-800 outline-none
                                     bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif prix */}
                  {nuits > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>
                          {Number(annonce.prix_par_nuit).toLocaleString("fr-FR")} FCFA
                          × {nuits} nuit{nuits > 1 ? "s" : ""}
                        </span>
                        <span>{montantTotal.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex
                                      justify-between font-bold text-gray-900">
                        <span>Total</span>
                        <span>{montantTotal.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    </div>
                  )}

                  {/* Bouton réserver */}
                  <button
                    type="submit"
                    disabled={resLoading || !dateDebut || !dateFin}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300
                               disabled:cursor-not-allowed text-white font-bold py-3.5
                               rounded-xl transition-colors text-sm"
                  >
                    {resLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"
                             fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10"
                                  stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Envoi en cours…
                      </span>
                    ) : !isAuthenticated ? (
                      "Se connecter pour réserver"
                    ) : nuits > 0 ? (
                      `Réserver · ${montantTotal.toLocaleString("fr-FR")} FCFA`
                    ) : (
                      "Choisir les dates"
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Aucun débit avant confirmation de l&apos;hôte
                  </p>
                </form>
              ) : (
                <div className="text-center py-6">
                  <p className="text-4xl mb-3">🚫</p>
                  <p className="font-semibold text-gray-700 mb-1">
                    Chambre indisponible
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Cette chambre n&apos;accepte pas de réservations pour le moment.
                  </p>
                  <Link
                    href="/listings"
                    className="text-sm text-red-500 hover:text-red-600
                               font-semibold underline underline-offset-4"
                  >
                    Voir d&apos;autres annonces
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
