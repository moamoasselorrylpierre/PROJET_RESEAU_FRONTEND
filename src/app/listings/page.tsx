"use client";
// ============================================================
//  KamerStay — app/listings/page.tsx
//  Liste des annonces : filtres, recherche, pagination
// ============================================================

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAnnonces, Annonce } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

// ══════════════════════════════════════════════════════════
//  COMPOSANT CARTE ANNONCE
// ══════════════════════════════════════════════════════════

function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const router = useRouter();
  return (
    <article
      onClick={() => router.push(`/listings/${annonce.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl
                 hover:-translate-y-1 transition-all duration-200 cursor-pointer
                 border border-gray-100 group"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {annonce.image_principale ? (
          <img
            src={annonce.image_principale}
            alt={annonce.titre}
            className="w-full h-full object-cover group-hover:scale-105
                       transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center
                          text-4xl bg-gradient-to-br from-red-50 to-orange-50">
            🏠
          </div>
        )}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm
                         text-gray-800 text-xs font-bold px-2.5 py-1
                         rounded-full shadow-sm">
          📍 {annonce.ville}
        </span>
        {!annonce.disponible && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center
                          justify-center">
            <span className="bg-gray-900 text-white text-xs font-bold
                             px-3 py-1.5 rounded-full">
              Indisponible
            </span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-1 text-sm">
          {annonce.titre}
        </h3>
        <p className="text-xs text-gray-400 mb-3 flex items-center gap-2">
          <span>👤 {annonce.capacite} pers.</span>
          {annonce.superficie && <span>· 📐 {annonce.superficie} m²</span>}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-gray-900 text-sm">
              {Number(annonce.prix_par_nuit).toLocaleString("fr-FR")}
            </span>
            <span className="text-gray-400 text-xs"> FCFA/nuit</span>
          </div>
          {annonce.note_moyenne ? (
            <span className="flex items-center gap-1 text-xs text-gray-500
                             bg-gray-50 px-2 py-1 rounded-full">
              ⭐ {parseFloat(String(annonce.note_moyenne)).toFixed(1)}
              {annonce.nombre_avis && (
                <span className="text-gray-400">({annonce.nombre_avis})</span>
              )}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ══════════════════════════════════════════════════════════
//  SQUELETTES
// ══════════════════════════════════════════════════════════

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-4 skeleton rounded w-1/3" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PAGE LISTINGS
// ══════════════════════════════════════════════════════════

const PAGE_SIZE = 9;

export default function ListingsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // ── Filtres (initialisés depuis l'URL) ─────────────────
  const [ville,    setVille]    = useState(searchParams.get("ville")    ?? "");
  const [capacite, setCapacite] = useState(searchParams.get("capacite") ?? "");
  const [prixMin,  setPrixMin]  = useState(searchParams.get("prix_min") ?? "");
  const [prixMax,  setPrixMax]  = useState(searchParams.get("prix_max") ?? "");
  const [tri,      setTri]      = useState(searchParams.get("tri")      ?? "recent");

  // ── Pagination ─────────────────────────────────────────
  const [page,  setPage]  = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Données ────────────────────────────────────────────
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── Chargement des annonces ────────────────────────────
  const fetchAnnonces = useCallback(async (p: number = 1) => {
    setLoading(true);
    const { data, error } = await getAnnonces({
      ...(ville    ? { ville }                       : {}),
      ...(capacite ? { capacite: Number(capacite) }  : {}),
      ...(prixMin  ? { prix_min: Number(prixMin) }   : {}),
      ...(prixMax  ? { prix_max: Number(prixMax) }   : {}),
      page: p,
      size: PAGE_SIZE,
    });

    if (error) {
      showToast("Erreur lors du chargement des annonces.", "error");
    } else if (data) {
      // Tri côté client si le backend ne le gère pas
      let results = data.annonces ?? [];
      if (tri === "prix_asc")  results = [...results].sort((a, b) => a.prix_par_nuit - b.prix_par_nuit);
      if (tri === "prix_desc") results = [...results].sort((a, b) => b.prix_par_nuit - a.prix_par_nuit);
      if (tri === "note")      results = [...results].sort((a, b) =>
        (parseFloat(String(b.note_moyenne ?? 0))) - (parseFloat(String(a.note_moyenne ?? 0)))
      );
      setAnnonces(results);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [ville, capacite, prixMin, prixMax, tri]); // eslint-disable-line

  // Rechargement quand les filtres ou la page changent
  useEffect(() => {
    fetchAnnonces(page);
  }, [page]); // eslint-disable-line

  // ── Soumission des filtres ─────────────────────────────
  function handleFilter(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAnnonces(1);

    // Mise à jour de l'URL pour le partage / retour
    const params = new URLSearchParams();
    if (ville)    params.set("ville",    ville);
    if (capacite) params.set("capacite", capacite);
    if (prixMin)  params.set("prix_min", prixMin);
    if (prixMax)  params.set("prix_max", prixMax);
    if (tri)      params.set("tri",      tri);
    router.replace(`/listings?${params.toString()}`, { scroll: false });
  }

  // ── Réinitialisation ───────────────────────────────────
  function handleReset() {
    setVille(""); setCapacite("");
    setPrixMin(""); setPrixMax("");
    setTri("recent"); setPage(1);
    router.replace("/listings", { scroll: false });
    fetchAnnonces(1);
  }

  const hasFilters = !!(ville || capacite || prixMin || prixMax);

  // ══════════════════════════════════════════════════════
  //  RENDU
  // ══════════════════════════════════════════════════════

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* ── EN-TÊTE ── */}
      <div className="mb-8">
        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900">
          Toutes les annonces
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          {loading
            ? "Chargement…"
            : `${total} chambre${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ── BARRE DE FILTRES ── */}
      <form
        onSubmit={handleFilter}
        className="bg-white rounded-2xl shadow-sm border border-gray-100
                   p-5 mb-8 flex flex-wrap gap-3 items-end"
      >
        {/* Ville */}
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Ville
          </label>
          <input
            type="text"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Yaoundé, Douala…"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                       outline-none focus:border-red-400 transition-colors
                       text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Capacité */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Personnes
          </label>
          <input
            type="number"
            value={capacite}
            onChange={(e) => setCapacite(e.target.value)}
            placeholder="Nb."
            min={1}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                       outline-none focus:border-red-400 transition-colors
                       text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Prix min */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Prix min (FCFA)
          </label>
          <input
            type="number"
            value={prixMin}
            onChange={(e) => setPrixMin(e.target.value)}
            placeholder="0"
            min={0}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                       outline-none focus:border-red-400 transition-colors
                       text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Prix max */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Prix max (FCFA)
          </label>
          <input
            type="number"
            value={prixMax}
            onChange={(e) => setPrixMax(e.target.value)}
            placeholder="∞"
            min={0}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                       outline-none focus:border-red-400 transition-colors
                       text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Tri */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Trier par
          </label>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm
                       outline-none focus:border-red-400 transition-colors
                       text-gray-800 bg-white"
          >
            <option value="recent">Plus récentes</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
            <option value="note">Mieux notées</option>
          </select>
        </div>

        {/* Boutons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="submit"
            className="bg-red-500 hover:bg-red-600 text-white font-bold
                       px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            🔍 Filtrer
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium
                         px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              ✕ Effacer
            </button>
          )}
        </div>
      </form>

      {/* ── FILTRES ACTIFS ── */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {ville && (
            <span className="flex items-center gap-1.5 bg-red-50 text-red-700
                             text-xs font-medium px-3 py-1.5 rounded-full border
                             border-red-200">
              📍 {ville}
              <button onClick={() => { setVille(""); fetchAnnonces(1); }}
                      className="hover:text-red-900 font-bold">✕</button>
            </span>
          )}
          {capacite && (
            <span className="flex items-center gap-1.5 bg-red-50 text-red-700
                             text-xs font-medium px-3 py-1.5 rounded-full border
                             border-red-200">
              👤 {capacite} pers.
              <button onClick={() => { setCapacite(""); fetchAnnonces(1); }}
                      className="hover:text-red-900 font-bold">✕</button>
            </span>
          )}
          {(prixMin || prixMax) && (
            <span className="flex items-center gap-1.5 bg-red-50 text-red-700
                             text-xs font-medium px-3 py-1.5 rounded-full border
                             border-red-200">
              💰 {prixMin || "0"} — {prixMax || "∞"} FCFA
              <button onClick={() => { setPrixMin(""); setPrixMax(""); fetchAnnonces(1); }}
                      className="hover:text-red-900 font-bold">✕</button>
            </span>
          )}
        </div>
      )}

      {/* ── GRILLE ANNONCES ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : annonces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {annonces.map((a) => (
            <AnnonceCard key={a.id} annonce={a} />
          ))}
        </div>
      ) : (
        /* État vide */
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔍</p>
          <h3 className="font-semibold text-gray-700 text-lg mb-2">
            Aucune annonce trouvée
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Essayez de modifier vos filtres ou élargissez votre recherche.
          </p>
          <button
            onClick={handleReset}
            className="bg-red-500 hover:bg-red-600 text-white font-bold
                       px-6 py-2.5 rounded-full text-sm transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* ── PAGINATION ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {/* Précédent */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm
                       font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40
                       disabled:cursor-not-allowed transition-colors"
          >
            ← Précédent
          </button>

          {/* Numéros de pages */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages ||
                           Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors
                              ${page === p
                                ? "bg-red-500 text-white"
                                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                >
                  {p}
                </button>
              )
            )}

          {/* Suivant */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm
                       font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40
                       disabled:cursor-not-allowed transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* ── CTA HÔTE (si pas de résultats) ── */}
      {!loading && annonces.length === 0 && !hasFilters && (
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-red-950
                        rounded-2xl p-8 text-white text-center">
          <h3 className="font-playfair text-2xl font-bold mb-3">
            Soyez le premier à publier !
          </h3>
          <p className="text-gray-300 text-sm mb-6">
            Aucune annonce n&apos;est disponible pour le moment.
            Rejoignez-nous en tant qu&apos;hôte.
          </p>
          <Link
            href="/register?role=HOTE"
            className="inline-block bg-red-500 hover:bg-red-600 text-white
                       font-bold px-6 py-3 rounded-full text-sm transition-colors"
          >
            Devenir hôte →
          </Link>
        </div>
      )}
    </div>
  );
}
