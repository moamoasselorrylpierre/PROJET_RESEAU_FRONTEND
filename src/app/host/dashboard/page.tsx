"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Users, Star, Calendar, Home, CalendarRange, Wallet, TrendingUp } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA } from "@/data/rooms";
import { imageUrl } from "@/lib/images";
import {
  getMesAnnonces, deleteAnnonce, getReservationsHote, refuserReservation, annulerReservation, getGainsHote,
  type Annonce, type Reservation, type StatutReservation, type GainsHote,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "./dashboard.module.css";

const STATUTS: Record<StatutReservation, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: "En attente", color: "#9A6B00", bg: "#FCEFC7" },
  CONFIRMEE:  { label: "Confirmée", color: "#1A3C2E", bg: "#D7EBDD" },
  TERMINEE:   { label: "Terminée", color: "#3A3A3A", bg: "#E8E2D6" },
  ANNULEE:    { label: "Annulée", color: "#A12A12", bg: "#F7D9D0" },
  REFUSEE:    { label: "Refusée", color: "#A12A12", bg: "#F7D9D0" },
};

function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default function HostDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<"annonces" | "reservations" | "gains">("annonces");
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [resas, setResas] = useState<Reservation[]>([]);
  const [gains, setGains] = useState<GainsHote | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, r, g] = await Promise.all([getMesAnnonces(), getReservationsHote(), getGainsHote()]);
    setAnnonces(a.data || []);
    setResas(r.data || []);
    setGains(g.data || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace("/login?redirect=/host/dashboard"); return; }
    if (!isLoading && user && user.role !== "HOTE") { showToast("Espace réservé aux hôtes.", "info"); router.replace("/"); return; }
    if (isAuthenticated && user?.role === "HOTE") load();
  }, [isLoading, isAuthenticated, user, router, load, showToast]);

  async function removeAnnonce(a: Annonce) {
    if (!confirm(`Supprimer l'annonce « ${a.titre} » ?`)) return;
    const { error } = await deleteAnnonce(a.id);
    if (error) { showToast(error, "error"); return; }
    showToast("Annonce supprimée.", "info"); load();
  }
  async function refuse(r: Reservation) {
    const { error } = await refuserReservation(r.idreservation);
    if (error) { showToast(error, "error"); return; }
    showToast("Réservation refusée.", "info"); load();
  }
  async function cancel(r: Reservation) {
    const { error } = await annulerReservation(r.idreservation);
    if (error) { showToast(error, "error"); return; }
    showToast("Réservation annulée.", "info"); load();
  }

  const pendingCount = resas.filter((r) => r.statut === "EN_ATTENTE").length;

  return (
    <div className={styles.pageWrap}>
      <div className={`mx-auto px-6 ${styles.container}`}>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className={`mb-1 ${styles.sectionTag}`}>Espace hôte</p>
            <h1 className={styles.pageTitle}>Tableau de bord</h1>
          </div>
          <Link href="/host/listings/create" className={`flex items-center gap-2 ${styles.newListingBtn}`}>
            <Plus size={16} /> Nouvelle annonce
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { Icon: Home, label: "Annonces", value: annonces.length },
            { Icon: CalendarRange, label: "Réservations", value: resas.length },
            { Icon: Calendar, label: "En attente", value: pendingCount },
          ].map(({ Icon, label, value }) => (
            <div key={label} className={`rounded-2xl p-5 flex items-center gap-4 ${styles.statCard}`}>
              <div className={`flex items-center justify-center rounded-full ${styles.statIconWrap}`}><Icon size={22} color="#1A3C2E" /></div>
              <div>
                <div className={styles.statValue}>{value}</div>
                <div className={styles.statLabel}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {([["annonces", "Mes annonces"], ["reservations", "Réservations reçues"], ["gains", "Mes gains"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`${styles.tabBtn} ${tab === t ? styles.tabActive : styles.tabInactive}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">{[...Array(2)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-[140px]" />)}</div>
        ) : tab === "annonces" ? (
          annonces.length === 0 ? (
            <Empty title="Aucune annonce" text="Publiez votre première chambre pour commencer à recevoir des réservations." cta={{ href: "/host/listings/create", label: "Créer une annonce" }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {annonces.map((a) => (
                <div key={a.id} className={`rounded-2xl overflow-hidden flex flex-col ${styles.listingCard}`}>
                  <div className={`relative ${styles.listingImage}`}>
                    <ImageWithFallback src={imageUrl(a.images?.[0])} alt={a.titre} className="w-full h-full object-cover" />
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full ${styles.listingStatus}`}>{a.statut || "DISPONIBLE"}</span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className={`mb-1 ${styles.listingTitle}`}>{a.titre}</h3>
                    <div className={`flex flex-wrap gap-3 mb-3 ${styles.listingMeta}`}>
                      <span className="flex items-center gap-1"><MapPin size={13} color="#C4622D" />{[a.quartier, a.ville].filter(Boolean).join(", ")}</span>
                      <span className="flex items-center gap-1"><Users size={13} />{a.capacite} pers.</span>
                      <span className="flex items-center gap-1"><Star size={13} fill="#C9943A" color="#C9943A" />{Number(a.note_moyenne || 0).toFixed(1)} ({a.nb_avis || 0})</span>
                    </div>
                    <div className={`mt-auto flex items-center justify-between pt-3 ${styles.divider}`}>
                      <span className={styles.listingPrice}>{formatFCFA(Number(a.prixparnuit ?? a.prix ?? 0))}<span className={styles.listingPeriod}> /nuit</span></span>
                      <div className="flex gap-2">
                        <Link href={`/host/listings/${a.id}/edit`} className={styles.iconBtn} title="Modifier"><Pencil size={16} color="#1A3C2E" /></Link>
                        <button onClick={() => removeAnnonce(a)} className={styles.iconBtn} title="Supprimer"><Trash2 size={16} color="#C4622D" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === "reservations" ? (
          resas.length === 0 ? (
            <Empty title="Aucune réservation" text="Les réservations de vos chambres apparaîtront ici." />
          ) : (
            <div className="flex flex-col gap-4">
              {resas.map((r) => {
                const st = STATUTS[r.statut];
                return (
                  <div key={r.idreservation} className={`rounded-2xl p-6 ${styles.reservationCard}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={styles.reservationTitle}>{r.annonce_titre}</h3>
                      <span className={styles.statusBadge} style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    </div>
                    <div className={`flex flex-wrap gap-4 mb-3 ${styles.reservationMeta}`}>
                      <span>👤 {r.client_prenom} {r.client_nom} · {r.client_email}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} color="#C9943A" />{fmtDate(r.datedebut)} → {fmtDate(r.datefin)}</span>
                      <span className="flex items-center gap-1.5"><Users size={14} color="#1A3C2E" />{r.nombrepersonnes} pers.</span>
                    </div>
                    <div className={`flex items-center justify-between pt-3 ${styles.divider}`}>
                      <div>
                        <span className={styles.reservationPrice}>{formatFCFA(Number(r.montanttotal))}</span>
                        {r.montant_paye != null ? (
                          <span className={styles.reservationMeta} style={{ marginLeft: 10 }}>
                            · Payé : {formatFCFA(Number(r.montant_paye))}
                            {r.statut_paiement === "PARTIEL"
                              ? ` (acompte 50% — reste ${formatFCFA(Number(r.montanttotal) - Number(r.montant_paye))})`
                              : " (intégral)"}
                          </span>
                        ) : (
                          <span className={styles.reservationMeta} style={{ marginLeft: 10 }}>· Non payé</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {r.statut === "EN_ATTENTE" && (<button onClick={() => refuse(r)} className={styles.btnOutline}>Refuser</button>)}
                        {(r.statut === "EN_ATTENTE" || r.statut === "CONFIRMEE") && (<button onClick={() => cancel(r)} className={styles.btnOutline}>Annuler</button>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { Icon: Wallet, label: "Total brut encaissé", value: Number(gains?.total_brut || 0) },
                { Icon: TrendingUp, label: "Commission plateforme", value: Number(gains?.total_commission || 0) },
                { Icon: Wallet, label: "Net reversé à vous", value: Number(gains?.total_net || 0) },
              ].map(({ Icon, label, value }) => (
                <div key={label} className={`rounded-2xl p-5 flex items-center gap-4 ${styles.statCard}`}>
                  <div className={`flex items-center justify-center rounded-full ${styles.statIconWrap}`}><Icon size={22} color="#1A3C2E" /></div>
                  <div>
                    <div className={styles.statValue}>{formatFCFA(value)}</div>
                    <div className={styles.statLabel}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
            {gains && gains.par_annonce.length > 0 ? (
              <div className="flex flex-col gap-3">
                {gains.par_annonce.map((g) => (
                  <div key={g.annonce_id} className={`rounded-2xl p-5 flex items-center justify-between ${styles.reservationCard}`}>
                    <div>
                      <h3 className={styles.reservationTitle}>{g.titre}</h3>
                      <span className={styles.reservationMeta}>{Number(g.nb_paiements)} paiement(s)</span>
                    </div>
                    <div className="text-right">
                      <div className={styles.reservationPrice}>{formatFCFA(Number(g.net))}</div>
                      <span className={styles.reservationMeta}>net · brut {formatFCFA(Number(g.brut))}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Aucun gain pour l'instant" text="Vos revenus apparaîtront ici dès qu'un client aura payé une réservation." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ title, text, cta }: { title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className={`text-center rounded-2xl p-12 ${styles.emptyCard}`}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={`mb-6 ${styles.emptyText}`}>{text}</p>
      {cta && <Link href={cta.href} className={styles.emptyLink}>{cta.label}</Link>}
    </div>
  );
}
