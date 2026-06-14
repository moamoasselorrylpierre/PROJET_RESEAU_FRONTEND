"use client";
// ============================================================
//  NidiRoom — app/host/dashboard/page.tsx
//  Tableau de bord hôte : statistiques, annonces, réservations
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAnnonces, getReservationsRecues,
  confirmerReservation, annulerReservation,
  deleteAnnonce, Annonce, Reservation,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useSocket } from "@/lib/socket";

// ══════════════════════════════════════════════════════════
//  TYPES ONGLETS
// ══════════════════════════════════════════════════════════

type Onglet = "stats" | "annonces" | "reservations";

// ══════════════════════════════════════════════════════════
//  UTILITAIRES
// ══════════════════════════════════════════════════════════

type Statut = Reservation["statut"];

const STATUT_CONFIG: Record<Statut, { label: string; color: string; icon: string }> = {
  EN_ATTENTE: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⏳" },
  CONFIRMEE:  { label: "Confirmée",  color: "bg-green-100 text-green-800 border-green-200",   icon: "✅" },
  ANNULEE:    { label: "Annulée",    color: "bg-red-100 text-red-700 border-red-200",          icon: "❌" },
  TERMINEE:   { label: "Terminée",   color: "bg-gray-100 text-gray-600 border-gray-200",       icon: "🏁" },
};

function StatutBadge({ statut }: { statut: Statut }) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      text-xs font-bold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function diffJours(debut: string, fin: string) {
  return Math.max(1, Math.ceil(
    (new Date(fin).getTime() - new Date(debut).getTime()) / 86400000
  ));
}

// ══════════════════════════════════════════════════════════
//  COMPOSANT CARTE STAT
// ══════════════════════════════════════════════════════════

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-gray-100
                     shadow-sm flex items-start gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                       text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  COMPOSANT CARTE ANNONCE (version dashboard)
// ══════════════════════════════════════════════════════════

function AnnonceRow({
  annonce, onDelete,
}: {
  annonce: Annonce; onDelete: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Supprimer "${annonce.titre}" ?`)) return;
    setDeleting(true);
    onDelete(annonce.id);
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center
                    gap-4 p-4 bg-white rounded-2xl border border-gray-100
                    shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="w-full sm:w-20 h-16 rounded-xl overflow-hidden
                      bg-gray-100 flex-shrink-0">
        {annonce.image_principale ? (
          <img src={annonce.image_principale} alt={annonce.titre}
               className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl
                          bg-gradient-to-br from-red-50 to-orange-50">🏠</div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {annonce.titre}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          📍 {annonce.ville} · 👤 {annonce.capacite} pers. ·{" "}
          {Number(annonce.prix_par_nuit).toLocaleString("fr-FR")} FCFA/nuit
        </p>
      </div>

      {/* Disponibilité */}
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0
                        ${annonce.disponible
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"}`}>
        {annonce.disponible ? "✅ Disponible" : "⏸ Pausée"}
      </span>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Link href={`/listings/${annonce.id}`}
          className="text-xs border border-gray-200 hover:border-gray-400
                     text-gray-600 font-medium px-3 py-1.5 rounded-xl
                     transition-colors">
          Voir
        </Link>
        <Link href={`/host/annonces/${annonce.id}/edit`}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700
                     font-medium px-3 py-1.5 rounded-xl transition-colors">
          Modifier
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-600
                     font-medium px-3 py-1.5 rounded-xl transition-colors
                     disabled:opacity-50">
          {deleting ? "…" : "Supprimer"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  COMPOSANT LIGNE RÉSERVATION (version dashboard hôte)
// ══════════════════════════════════════════════════════════

function ReservationRow({
  reservation, onConfirmer, onAnnuler, actionLoading,
}: {
  reservation:   Reservation;
  onConfirmer:   (id: number) => void;
  onAnnuler:     (id: number) => void;
  actionLoading: number | null;
}) {
  const { statut, annonce } = reservation;
  const isLoading = actionLoading === reservation.id;
  const nuits = diffJours(reservation.date_debut, reservation.date_fin);

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm
                     overflow-hidden transition-shadow hover:shadow-md
                     ${statut === "ANNULEE" ? "opacity-60" : ""}`}>
      <div className={`h-1 w-full
        ${statut === "CONFIRMEE"  ? "bg-green-400"  : ""}
        ${statut === "EN_ATTENTE" ? "bg-yellow-400" : ""}
        ${statut === "ANNULEE"    ? "bg-red-400"    : ""}
        ${statut === "TERMINEE"   ? "bg-gray-300"   : ""}`}
      />
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {reservation.annonce?.titre ?? "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Locataire :{" "}
              <span className="font-medium text-gray-600">
                {reservation.locataire?.prenom} {reservation.locataire?.nom}
              </span>
              {reservation.locataire?.email && (
                <span className="ml-1 text-gray-400">
                  · {reservation.locataire.email}
                </span>
              )}
            </p>
          </div>
          <StatutBadge statut={statut} />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
          <span>📅 {formatDate(reservation.date_debut)} → {formatDate(reservation.date_fin)}</span>
          <span>🌙 {nuits} nuit{nuits > 1 ? "s" : ""}</span>
          <span className="font-semibold text-gray-800">
            💰 {Number(reservation.montant_total).toLocaleString("fr-FR")} FCFA
          </span>
        </div>

        {/* Actions hôte */}
        {statut === "EN_ATTENTE" && (
          <div className="flex gap-2">
            <button
              onClick={() => onConfirmer(reservation.id)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300
                         text-white font-bold px-4 py-2 rounded-xl text-xs
                         transition-colors flex items-center gap-1.5">
              {isLoading ? (
                <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Traitement…</>
              ) : <>✅ Confirmer</>}
            </button>
            <button
              onClick={() => onAnnuler(reservation.id)}
              disabled={isLoading}
              className="border border-red-200 hover:bg-red-50 text-red-600
                         font-medium px-4 py-2 rounded-xl text-xs
                         transition-colors disabled:opacity-50">
              {isLoading ? "…" : "❌ Refuser"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SQUELETTES
// ══════════════════════════════════════════════════════════

function SkeletonStat() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm
                    flex items-start gap-4">
      <div className="w-12 h-12 skeleton rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-7 skeleton rounded w-1/3" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════

export default function HostDashboardPage() {
  const router              = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast }       = useToast();

  const [onglet,        setOnglet]        = useState<Onglet>("stats");
  const [annonces,      setAnnonces]      = useState<Annonce[]>([]);
  const [reservations,  setReservations]  = useState<Reservation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filtreRes,     setFiltreRes]     = useState<Statut | "TOUT">("TOUT");

  // ── Garde : hôte connecté uniquement ──────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login"); return;
    }
    if (user && user.role !== "HOTE") {
      showToast("Accès réservé aux hôtes.", "error");
      router.push("/"); return;
    }
  }, [isAuthenticated, user]); // eslint-disable-line

  // ── Chargement initial ─────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "HOTE") return;
    async function load() {
      setLoading(true);
      const [resAnnonces, resReservations] = await Promise.all([
        getAnnonces(),
        getReservationsRecues(),
      ]);
      if (resAnnonces.data)     setAnnonces(resAnnonces.data.annonces ?? []);
      if (resReservations.data) setReservations(resReservations.data ?? []);
      setLoading(false);
    }
    load();
  }, [isAuthenticated, user]); // eslint-disable-line

  // ── Mise à jour temps réel ────────────────────────────
  useSocket("notifications", (notif) => {
    if (notif.type === "RESERVATION_RECUE") {
      getReservationsRecues().then(({ data }) => {
        if (data) setReservations(data);
      });
      showToast("🔔 Nouvelle demande de réservation reçue !", "info", 6000);
    }
  });

  // ── Confirmer une réservation ─────────────────────────
  async function handleConfirmer(id: number) {
    setActionLoading(id);
    const { data, error } = await confirmerReservation(id);
    setActionLoading(null);
    if (error || !data) {
      showToast(error || "Erreur lors de la confirmation.", "error"); return;
    }
    setReservations((prev) =>
      prev.map((r) => r.id === id ? { ...r, statut: "CONFIRMEE" } : r)
    );
    showToast("Réservation confirmée ✅", "success");
  }

  // ── Annuler / Refuser une réservation ─────────────────
  async function handleAnnuler(id: number) {
    setActionLoading(id);
    const { error } = await annulerReservation(id);
    setActionLoading(null);
    if (error) {
      showToast(error || "Erreur lors de l'annulation.", "error"); return;
    }
    setReservations((prev) =>
      prev.map((r) => r.id === id ? { ...r, statut: "ANNULEE" } : r)
    );
    showToast("Réservation refusée.", "success");
  }

  // ── Supprimer une annonce ─────────────────────────────
  async function handleDeleteAnnonce(id: number) {
    const { error } = await deleteAnnonce(id);
    if (error) {
      showToast(error || "Erreur lors de la suppression.", "error"); return;
    }
    setAnnonces((prev) => prev.filter((a) => a.id !== id));
    showToast("Annonce supprimée.", "success");
  }

  // ── Statistiques calculées ────────────────────────────
  const stats = {
    totalAnnonces:   annonces.length,
    annoncesActives: annonces.filter((a) => a.disponible).length,
    totalRes:        reservations.length,
    resEnAttente:    reservations.filter((r) => r.statut === "EN_ATTENTE").length,
    resConfirmees:   reservations.filter((r) => r.statut === "CONFIRMEE").length,
    revenuTotal:     reservations
      .filter((r) => r.statut === "CONFIRMEE" || r.statut === "TERMINEE")
      .reduce((sum, r) => sum + Number(r.montant_total), 0),
  };

  // ── Filtrage réservations ─────────────────────────────
  const reservationsFiltrees = filtreRes === "TOUT"
    ? reservations
    : reservations.filter((r) => r.statut === filtreRes);

  // ══════════════════════════════════════════════════════
  //  RENDU
  // ══════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

      {/* ── EN-TÊTE ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Bienvenue, {user?.prenom} 👋 — Espace hôte
          </p>
        </div>
        <Link href="/host/annonces/new"
          className="bg-red-500 hover:bg-red-600 text-white font-bold
                     px-5 py-2.5 rounded-xl text-sm transition-colors
                     flex items-center gap-2">
          ＋ Nouvelle annonce
        </Link>
      </div>

      {/* ── ONGLETS ── */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm
                      border border-gray-100 w-fit mb-8">
        {([
          { key: "stats",        label: "📊 Statistiques"  },
          { key: "annonces",     label: "🏠 Mes annonces"  },
          { key: "reservations", label: "📅 Réservations"  },
        ] as { key: Onglet; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setOnglet(key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold
                        transition-all whitespace-nowrap
                        ${onglet === key
                          ? "bg-red-500 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            {label}
            {key === "reservations" && stats.resEnAttente > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold
                                ${onglet === key
                                  ? "bg-white/30 text-white"
                                  : "bg-red-500 text-white"}`}>
                {stats.resEnAttente}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════ ONGLET STATISTIQUES ══════ */}
      {onglet === "stats" && (
        <div className="space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonStat key={i} />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon="🏠" label="Total annonces"
                  value={stats.totalAnnonces}
                  sub={`${stats.annoncesActives} active${stats.annoncesActives > 1 ? "s" : ""}`}
                  color="bg-red-50" />
                <StatCard icon="📅" label="Total réservations"
                  value={stats.totalRes}
                  sub={`${stats.resEnAttente} en attente`}
                  color="bg-yellow-50" />
                <StatCard icon="✅" label="Réservations confirmées"
                  value={stats.resConfirmees}
                  color="bg-green-50" />
                <StatCard icon="💰" label="Revenu total"
                  value={`${stats.revenuTotal.toLocaleString("fr-FR")} FCFA`}
                  sub="Confirmées + Terminées"
                  color="bg-blue-50" />
                <StatCard icon="⭐" label="Note moyenne"
                  value={
                    annonces.some((a) => a.note_moyenne)
                      ? (annonces.reduce((s, a) =>
                          s + parseFloat(String(a.note_moyenne ?? 0)), 0
                        ) / annonces.filter((a) => a.note_moyenne).length
                        ).toFixed(1) + " / 5"
                      : "—"
                  }
                  color="bg-purple-50" />
                <StatCard icon="⏳" label="En attente de réponse"
                  value={stats.resEnAttente}
                  sub="À traiter rapidement"
                  color="bg-orange-50" />
              </div>

              {/* Accès rapide */}
              <div className="bg-white rounded-2xl border border-gray-100
                              shadow-sm p-6">
                <h2 className="font-bold text-gray-800 mb-4">Accès rapide</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button onClick={() => setOnglet("reservations")}
                    className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl
                               border border-yellow-200 hover:bg-yellow-100
                               transition-colors text-left">
                    <span className="text-2xl">⏳</span>
                    <div>
                      <p className="font-bold text-yellow-800 text-sm">
                        {stats.resEnAttente} en attente
                      </p>
                      <p className="text-xs text-yellow-600">À confirmer ou refuser</p>
                    </div>
                  </button>
                  <button onClick={() => setOnglet("annonces")}
                    className="flex items-center gap-3 p-4 bg-red-50 rounded-xl
                               border border-red-200 hover:bg-red-100
                               transition-colors text-left">
                    <span className="text-2xl">🏠</span>
                    <div>
                      <p className="font-bold text-red-800 text-sm">
                        {stats.totalAnnonces} annonce{stats.totalAnnonces > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-red-600">Gérer mes annonces</p>
                    </div>
                  </button>
                  <Link href="/host/annonces/new"
                    className="flex items-center gap-3 p-4 bg-green-50 rounded-xl
                               border border-green-200 hover:bg-green-100
                               transition-colors">
                    <span className="text-2xl">＋</span>
                    <div>
                      <p className="font-bold text-green-800 text-sm">
                        Nouvelle annonce
                      </p>
                      <p className="text-xs text-green-600">Publier une chambre</p>
                    </div>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════ ONGLET ANNONCES ══════ */}
      {onglet === "annonces" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">
              {annonces.length} annonce{annonces.length > 1 ? "s" : ""} publiée{annonces.length > 1 ? "s" : ""}
            </p>
            <Link href="/host/annonces/new"
              className="bg-red-500 hover:bg-red-600 text-white font-bold
                         px-4 py-2 rounded-xl text-xs transition-colors">
              ＋ Ajouter
            </Link>
          </div>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-2xl" />
            ))
          ) : annonces.length > 0 ? (
            annonces.map((a) => (
              <AnnonceRow key={a.id} annonce={a}
                onDelete={handleDeleteAnnonce} />
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border
                            border-gray-100">
              <p className="text-5xl mb-4">🏠</p>
              <h3 className="font-semibold text-gray-700 mb-2">
                Aucune annonce publiée
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Publiez votre première chambre et commencez à recevoir des réservations.
              </p>
              <Link href="/host/annonces/new"
                className="inline-block bg-red-500 hover:bg-red-600 text-white
                           font-bold px-6 py-3 rounded-full text-sm transition-colors">
                Publier ma première annonce
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══════ ONGLET RÉSERVATIONS ══════ */}
      {onglet === "reservations" && (
        <div className="space-y-4">
          {/* Filtres rapides */}
          <div className="flex gap-2 flex-wrap">
            {(["TOUT", "EN_ATTENTE", "CONFIRMEE", "TERMINEE", "ANNULEE"] as const).map((s) => (
              <button key={s} onClick={() => setFiltreRes(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                            transition-all border
                            ${filtreRes === s
                              ? "bg-red-500 text-white border-red-500"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                {s === "TOUT" ? "Toutes" : STATUT_CONFIG[s].label}
                <span className="ml-1.5 opacity-70">
                  ({s === "TOUT"
                    ? reservations.length
                    : reservations.filter((r) => r.statut === s).length})
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 skeleton rounded-2xl" />
            ))
          ) : reservationsFiltrees.length > 0 ? (
            reservationsFiltrees.map((r) => (
              <ReservationRow
                key={r.id}
                reservation={r}
                onConfirmer={handleConfirmer}
                onAnnuler={handleAnnuler}
                actionLoading={actionLoading}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border
                            border-gray-100">
              <p className="text-5xl mb-4">📅</p>
              <h3 className="font-semibold text-gray-700 mb-2">
                Aucune réservation
              </h3>
              <p className="text-gray-400 text-sm">
                {filtreRes === "TOUT"
                  ? "Vous n'avez reçu aucune demande pour le moment."
                  : `Aucune réservation avec le statut "${STATUT_CONFIG[filtreRes as Statut]?.label}".`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
