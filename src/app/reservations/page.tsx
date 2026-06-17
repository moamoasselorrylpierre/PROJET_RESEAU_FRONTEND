"use client";
// ============================================================
//  KamerStay — app/reservations/page.tsx  (Mes réservations — CLIENT)
//  Payer (si EN_ATTENTE), annuler, laisser un avis (si TERMINEE).
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Users, Star, X } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA } from "@/data/rooms";
import { imageUrl } from "@/lib/images";
import {
  getMesReservations, createPaiement, annulerReservation, createAvis,
  type Reservation, type ModePaiement, type StatutReservation,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const STATUTS: Record<StatutReservation, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: "En attente de paiement", color: "#9A6B00", bg: "#FCEFC7" },
  CONFIRMEE:  { label: "Confirmée",               color: "#1A3C2E", bg: "#D7EBDD" },
  TERMINEE:   { label: "Terminée",                color: "#3A3A3A", bg: "#E8E2D6" },
  ANNULEE:    { label: "Annulée",                 color: "#A12A12", bg: "#F7D9D0" },
  REFUSEE:    { label: "Refusée",                 color: "#A12A12", bg: "#F7D9D0" },
};

const payModes: { id: ModePaiement; label: string; icon: string }[] = [
  { id: "MOBILE_MONEY", label: "Mobile Money (MTN / Orange)", icon: "📱" },
  { id: "CARTE", label: "Carte bancaire", icon: "💳" },
  { id: "ESPECES", label: "À l'hôtel (espèces)", icon: "🏨" },
];

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReservationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useToast();

  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState<Reservation | null>(null);
  const [payMode, setPayMode] = useState<ModePaiement>("MOBILE_MONEY");
  const [reviewFor, setReviewFor] = useState<Reservation | null>(null);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getMesReservations();
    setList(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace("/login?redirect=/reservations"); return; }
    if (!isLoading && user?.role !== "CLIENT") { showToast("Espace réservé aux comptes CLIENT.", "info"); return; }
    if (isAuthenticated) load();
  }, [isLoading, isAuthenticated, user, router, load, showToast]);

  async function confirmPay() {
    if (!payFor) return;
    setBusy(true);
    const { error } = await createPaiement({ reservation_id: payFor.idreservation, mode_paiement: payMode });
    setBusy(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Paiement effectué — réservation confirmée !", "success");
    setPayFor(null); load();
  }

  async function cancel(r: Reservation) {
    const { error } = await annulerReservation(r.idreservation);
    if (error) { showToast(error, "error"); return; }
    showToast("Réservation annulée.", "info"); load();
  }

  async function submitReview() {
    if (!reviewFor) return;
    setBusy(true);
    const { error } = await createAvis({ reservation_id: reviewFor.idreservation, note, commentaire });
    setBusy(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Merci pour votre avis !", "success");
    setReviewFor(null); setCommentaire(""); setNote(5); load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: "104px", paddingBottom: 60 }}>
      <div className="mx-auto px-6" style={{ maxWidth: "960px" }}>
        <p className="mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Mon espace voyageur</p>
        <h1 className="mb-8" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 600, color: "#1A3C2E" }}>Mes réservations</h1>

        {loading ? (
          <div className="flex flex-col gap-4">{[...Array(2)].map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 150 }} />)}</div>
        ) : list.length === 0 ? (
          <div className="text-center rounded-2xl p-12" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: "#1A3C2E", marginBottom: 8 }}>Aucune réservation pour l&apos;instant</p>
            <p className="mb-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(28,28,28,0.55)" }}>Trouvez votre prochain séjour au Cameroun.</p>
            <Link href="/search" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", borderRadius: 10, padding: "12px 28px", textDecoration: "none" }}>Explorer les hôtels</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {list.map((r) => {
              const st = STATUTS[r.statut];
              const img = imageUrl(r.images?.[0]);
              return (
                <div key={r.idreservation} className="rounded-2xl overflow-hidden flex flex-col md:flex-row" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 2px 16px rgba(26,60,46,0.05)" }}>
                  <div style={{ width: 200, minHeight: 150, flexShrink: 0 }} className="relative">
                    <ImageWithFallback src={img} alt={r.annonce_titre || "Chambre"} className="w-full h-full object-cover" style={{ minHeight: 150 }} />
                  </div>
                  <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "#1C1C1C" }}>{r.annonce_titre}</h3>
                      <span className="px-3 py-1 rounded-full flex-shrink-0" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(28,28,28,0.6)" }}>
                      <span className="flex items-center gap-1.5"><MapPin size={14} color="#C4622D" />{[r.quartier, r.ville].filter(Boolean).join(", ")}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={14} color="#C9943A" />{fmtDate(r.datedebut)} → {fmtDate(r.datefin)}</span>
                      <span className="flex items-center gap-1.5"><Users size={14} color="#1A3C2E" />{r.nombrepersonnes} pers.</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(26,60,46,0.07)" }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#C9943A" }}>{formatFCFA(Number(r.montanttotal))}</span>
                      <div className="flex gap-2">
                        {r.statut === "EN_ATTENTE" && (<button onClick={() => { setPayFor(r); setPayMode("MOBILE_MONEY"); }} className="resa-btn-gold">Payer</button>)}
                        {(r.statut === "EN_ATTENTE" || r.statut === "CONFIRMEE") && (<button onClick={() => cancel(r)} className="resa-btn-outline">Annuler</button>)}
                        {r.statut === "TERMINEE" && (<button onClick={() => { setReviewFor(r); setNote(5); }} className="resa-btn-gold">Laisser un avis</button>)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal paiement */}
      {payFor && (
        <Modal onClose={() => setPayFor(null)} title="Procéder au paiement">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(28,28,28,0.6)", marginBottom: 16 }}>
            {payFor.annonce_titre} — <strong style={{ color: "#C9943A" }}>{formatFCFA(Number(payFor.montanttotal))}</strong>
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {payModes.map((m) => (
              <button key={m.id} onClick={() => setPayMode(m.id)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: payMode === m.id ? "rgba(201,148,58,0.12)" : "#F7F3EC", border: payMode === m.id ? "2px solid #C9943A" : "2px solid transparent", cursor: "pointer" }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#1C1C1C" }}>{m.label}</span>
              </button>
            ))}
          </div>
          <button onClick={confirmPay} disabled={busy} className="w-full resa-btn-gold" style={{ padding: 14 }}>{busy ? "Traitement…" : "Confirmer le paiement"}</button>
        </Modal>
      )}

      {/* Modal avis */}
      {reviewFor && (
        <Modal onClose={() => setReviewFor(null)} title="Votre avis">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(28,28,28,0.6)", marginBottom: 16 }}>{reviewFor.annonce_titre}</p>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setNote(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                <Star size={28} fill={n <= note ? "#C9943A" : "none"} color="#C9943A" />
              </button>
            ))}
          </div>
          <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Partagez votre expérience…" rows={4} style={{ width: "100%", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1C1C1C", background: "#F7F3EC", border: "1px solid rgba(26,60,46,0.15)", borderRadius: 10, padding: 12, outline: "none", marginBottom: 16, resize: "vertical" }} />
          <button onClick={submitReview} disabled={busy} className="w-full resa-btn-gold" style={{ padding: 14 }}>{busy ? "Envoi…" : "Publier l'avis"}</button>
        </Modal>
      )}

      <style>{`
        .resa-btn-gold { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; color:#1A3C2E; background:linear-gradient(135deg, #C9943A, #D9A84A); border:none; border-radius:8px; padding:9px 18px; cursor:pointer; box-shadow:0 2px 10px rgba(201,148,58,0.3); }
        .resa-btn-outline { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; color:#C4622D; background:none; border:1.5px solid rgba(196,98,45,0.4); border-radius:8px; padding:9px 18px; cursor:pointer; }
      `}</style>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(26,60,46,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full rounded-2xl p-7" style={{ maxWidth: 420, background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: "#1A3C2E" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} color="#1C1C1C" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
