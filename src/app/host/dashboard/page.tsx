"use client";
// ============================================================
//  KamerStay — app/host/dashboard/page.tsx  (Espace hôte)
//  Mes annonces (CRUD) + réservations reçues (refuser / annuler).
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Users, Star, Calendar, Home, CalendarRange } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA } from "@/data/rooms";
import { imageUrl } from "@/lib/images";
import {
  getMesAnnonces, deleteAnnonce, getReservationsHote, refuserReservation, annulerReservation,
  type Annonce, type Reservation, type StatutReservation,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

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

  const [tab, setTab] = useState<"annonces" | "reservations">("annonces");
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [resas, setResas] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, r] = await Promise.all([getMesAnnonces(), getReservationsHote()]);
    setAnnonces(a.data || []);
    setResas(r.data || []);
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
    <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: "104px", paddingBottom: 60 }}>
      <div className="mx-auto px-6" style={{ maxWidth: "1100px" }}>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Espace hôte</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: "#1A3C2E" }}>Tableau de bord</h1>
          </div>
          <Link href="/host/listings/create" className="flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", borderRadius: 10, padding: "12px 22px", textDecoration: "none", boxShadow: "0 4px 16px rgba(201,148,58,0.3)" }}>
            <Plus size={16} /> Nouvelle annonce
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { Icon: Home, label: "Annonces", value: annonces.length },
            { Icon: CalendarRange, label: "Réservations", value: resas.length },
            { Icon: Calendar, label: "En attente", value: pendingCount },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
              <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: "rgba(26,60,46,0.08)" }}><Icon size={22} color="#1A3C2E" /></div>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: "#1A3C2E", lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(28,28,28,0.5)" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([["annonces", "Mes annonces"], ["reservations", "Réservations reçues"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: tab === t ? "#fff" : "#1A3C2E", background: tab === t ? "#1A3C2E" : "#fff", border: "1px solid rgba(26,60,46,0.12)", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">{[...Array(2)].map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 140 }} />)}</div>
        ) : tab === "annonces" ? (
          annonces.length === 0 ? (
            <Empty title="Aucune annonce" text="Publiez votre première chambre pour commencer à recevoir des réservations." cta={{ href: "/host/listings/create", label: "Créer une annonce" }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {annonces.map((a) => (
                <div key={a.id} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
                  <div className="relative" style={{ height: 160 }}>
                    <ImageWithFallback src={imageUrl(a.images?.[0])} alt={a.titre} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "#1A3C2E", background: "rgba(255,255,255,0.92)" }}>{a.statut || "DISPONIBLE"}</span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 700, color: "#1C1C1C" }}>{a.titre}</h3>
                    <div className="flex flex-wrap gap-3 mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(28,28,28,0.55)" }}>
                      <span className="flex items-center gap-1"><MapPin size={13} color="#C4622D" />{[a.quartier, a.ville].filter(Boolean).join(", ")}</span>
                      <span className="flex items-center gap-1"><Users size={13} />{a.capacite} pers.</span>
                      <span className="flex items-center gap-1"><Star size={13} fill="#C9943A" color="#C9943A" />{Number(a.note_moyenne || 0).toFixed(1)} ({a.nb_avis || 0})</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(26,60,46,0.07)" }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#C9943A" }}>{formatFCFA(Number(a.prixparnuit ?? a.prix ?? 0))}<span style={{ fontSize: 12, color: "rgba(28,28,28,0.45)", fontFamily: "'DM Sans', sans-serif" }}> /nuit</span></span>
                      <div className="flex gap-2">
                        <Link href={`/host/listings/${a.id}/edit`} className="host-icon-btn" title="Modifier"><Pencil size={16} color="#1A3C2E" /></Link>
                        <button onClick={() => removeAnnonce(a)} className="host-icon-btn" title="Supprimer"><Trash2 size={16} color="#C4622D" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          resas.length === 0 ? (
            <Empty title="Aucune réservation" text="Les réservations de vos chambres apparaîtront ici." />
          ) : (
            <div className="flex flex-col gap-4">
              {resas.map((r) => {
                const st = STATUTS[r.statut];
                return (
                  <div key={r.idreservation} className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 700, color: "#1C1C1C" }}>{r.annonce_titre}</h3>
                      <span className="px-3 py-1 rounded-full flex-shrink-0" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(28,28,28,0.6)" }}>
                      <span>👤 {r.client_prenom} {r.client_nom} · {r.client_email}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} color="#C9943A" />{fmtDate(r.datedebut)} → {fmtDate(r.datefin)}</span>
                      <span className="flex items-center gap-1.5"><Users size={14} color="#1A3C2E" />{r.nombrepersonnes} pers.</span>
                    </div>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(26,60,46,0.07)" }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#C9943A" }}>{formatFCFA(Number(r.montanttotal))}</span>
                      <div className="flex gap-2">
                        {r.statut === "EN_ATTENTE" && (<button onClick={() => refuse(r)} className="resa-btn-outline">Refuser</button>)}
                        {(r.statut === "EN_ATTENTE" || r.statut === "CONFIRMEE") && (<button onClick={() => cancel(r)} className="resa-btn-outline">Annuler</button>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
      <style>{`
        .host-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:#F7F3EC; border:1px solid rgba(26,60,46,0.1); cursor:pointer; text-decoration:none; }
        .host-icon-btn:hover { background:#EFE7D8; }
        .resa-btn-outline { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; color:#C4622D; background:none; border:1.5px solid rgba(196,98,45,0.4); border-radius:8px; padding:9px 18px; cursor:pointer; }
      `}</style>
    </div>
  );
}

function Empty({ title, text, cta }: { title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className="text-center rounded-2xl p-12" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: "#1A3C2E", marginBottom: 8 }}>{title}</p>
      <p className="mb-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(28,28,28,0.55)" }}>{text}</p>
      {cta && <Link href={cta.href} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", borderRadius: 10, padding: "12px 28px", textDecoration: "none" }}>{cta.label}</Link>}
    </div>
  );
}
