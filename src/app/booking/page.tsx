"use client";
// ============================================================
//  KamerStay — app/booking/page.tsx  (Réservation + paiement)
//  Crée une réservation (POST /reservations) puis la confirme
//  par un paiement (POST /paiements). Réservé aux CLIENTS connectés.
// ============================================================

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Download, Home } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA, annonceToRoom, type Room } from "@/data/rooms";
import { getAnnonce, createReservation, createPaiement, type ModePaiement } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const paymentMethods: { id: string; label: string; color: string; bg: string; icon: string; description: string; mode: ModePaiement }[] = [
  { id: "orange", label: "Orange Money", color: "#FF6600", bg: "#FFF3EC", icon: "📱", description: "#150# → Envoyer vers 699 000 111", mode: "MOBILE_MONEY" },
  { id: "mtn", label: "MTN Mobile Money", color: "#FFCC00", bg: "#FFFBEC", icon: "📱", description: "*126# → Payer un marchand", mode: "MOBILE_MONEY" },
  { id: "visa", label: "Carte Visa / Mastercard", color: "#1A1F71", bg: "#F0F2FF", icon: "💳", description: "Paiement sécurisé 3D Secure", mode: "CARTE" },
  { id: "hotel", label: "Paiement à l'hôtel", color: "#1A3C2E", bg: "#F0F5F2", icon: "🏨", description: "Régler directement à votre arrivée", mode: "ESPECES" },
];

function BookingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();

  const roomId = sp.get("room");
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState(sp.get("checkin") || "");
  const [checkout, setCheckout] = useState(sp.get("checkout") || "");
  const [guests, setGuests] = useState(Number(sp.get("guests") || 2));
  const [selectedPayment, setSelectedPayment] = useState("orange");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [ref, setRef] = useState("");

  // Redirection si non connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const back = `/booking?${sp.toString()}`;
      router.replace(`/login?redirect=${encodeURIComponent(back)}`);
    }
  }, [isLoading, isAuthenticated, router, sp]);

  useEffect(() => {
    (async () => {
      if (!roomId) { setLoading(false); return; }
      const { data } = await getAnnonce(roomId);
      if (data) setRoom(annonceToRoom(data));
      setLoading(false);
    })();
  }, [roomId]);

  const nights = checkin && checkout
    ? Math.max(1, Math.ceil((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 0;
  const total = room ? room.price * nights : 0;

  async function handleConfirm() {
    if (!room) return;
    if (user?.role !== "CLIENT") { showToast("Seuls les comptes CLIENT peuvent réserver.", "error"); return; }
    if (!checkin || !checkout) { showToast("Veuillez choisir les dates d'arrivée et de départ.", "error"); return; }
    if (new Date(checkout) <= new Date(checkin)) { showToast("La date de départ doit être après l'arrivée.", "error"); return; }
    if (guests > room.guests) { showToast(`Cette chambre accueille au maximum ${room.guests} personne(s).`, "error"); return; }

    setSubmitting(true);
    const mode = paymentMethods.find((p) => p.id === selectedPayment)?.mode || "MOBILE_MONEY";

    const resa = await createReservation({ annonce_id: room.id, dateDebut: checkin, dateFin: checkout, nombrePersonnes: guests });
    if (resa.error || !resa.data) { showToast(resa.error || "Échec de la réservation.", "error"); setSubmitting(false); return; }

    const reservationId = resa.data.reservation.idreservation;
    const pay = await createPaiement({ reservation_id: reservationId, mode_paiement: mode });
    if (pay.error) {
      showToast(`Réservation créée mais paiement non finalisé : ${pay.error}. Vous pouvez payer depuis « Mes réservations ».`, "warning");
      router.push("/reservations");
      return;
    }

    setRef(`KS-${reservationId}`);
    setConfirmed(true);
    setSubmitting(false);
    showToast("Paiement effectué — réservation confirmée !", "success");
  }

  if (isLoading || loading) {
    return <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: 120 }} className="mx-auto px-6 max-w-3xl"><div className="skeleton rounded-2xl" style={{ height: 300 }} /></div>;
  }

  if (!room) {
    return (
      <div style={{ minHeight: "100vh", background: "#F7F3EC", paddingTop: 140 }} className="text-center px-6">
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, color: "#1A3C2E" }}>Aucune chambre sélectionnée</h1>
        <button onClick={() => router.push("/search")} className="mt-6" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: 10, padding: "12px 28px", cursor: "pointer" }}>Parcourir les hôtels</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#F7F3EC", minHeight: "100vh", paddingTop: "88px", paddingBottom: "60px" }}>
      <div className="mx-auto px-6" style={{ maxWidth: "800px" }}>
        {!confirmed ? (
          <>
            <div className="text-center mb-10">
              <p className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Finaliser la réservation</p>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "48px", fontWeight: 600, color: "#1A3C2E", lineHeight: 1.1 }}>Récapitulatif</h1>
            </div>

            <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 4px 24px rgba(26,60,46,0.07)" }}>
              <div className="flex flex-col md:flex-row">
                <div style={{ width: "100%", maxWidth: "240px", minHeight: "180px", overflow: "hidden", flexShrink: 0 }}>
                  <ImageWithFallback src={room.image} alt={room.name} style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: "180px" }} />
                </div>
                <div className="flex-1 p-7">
                  <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "#C9943A", marginBottom: "4px" }}>{room.hotel}</p>
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: "#1C1C1C", marginBottom: "16px" }}>{room.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="bk-label">Arrivée</p>
                      <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className="bk-input" />
                    </div>
                    <div>
                      <p className="bk-label">Départ</p>
                      <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} className="bk-input" />
                    </div>
                    <div>
                      <p className="bk-label">Voyageurs</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setGuests((g) => Math.max(1, g - 1))} className="bk-step">−</button>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600 }}>{guests}</span>
                        <button onClick={() => setGuests((g) => Math.min(room.guests, g + 1))} className="bk-step">+</button>
                      </div>
                    </div>
                    <div>
                      <p className="bk-label">Durée</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1C1C1C", paddingTop: 6 }}>{nights || "—"} nuit{nights > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(26,60,46,0.07)" }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: "rgba(28,28,28,0.6)" }}>Total{nights ? ` pour ${nights} nuit${nights > 1 ? "s" : ""}` : ""}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 700, color: "#C9943A" }}>{formatFCFA(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-7 mb-6" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 2px 16px rgba(26,60,46,0.05)" }}>
              <h3 className="mb-6" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 700, color: "#1C1C1C" }}>Mode de paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((pm) => (
                  <button key={pm.id} onClick={() => setSelectedPayment(pm.id)} className="flex items-center gap-4 rounded-xl p-4 text-left" style={{ background: selectedPayment === pm.id ? pm.bg : "#fff", border: selectedPayment === pm.id ? `2px solid ${pm.color}` : "2px solid rgba(26,60,46,0.1)", cursor: "pointer", transition: "all 0.2s" }}>
                    <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 48, height: 48, background: pm.bg, border: `1px solid ${pm.color}33`, fontSize: "22px" }}>{pm.icon}</div>
                    <div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: "#1C1C1C", marginBottom: "2px" }}>{pm.label}</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "rgba(28,28,28,0.5)" }}>{pm.description}</p>
                    </div>
                    {selectedPayment === pm.id && (<div className="ml-auto flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 24, height: 24, background: pm.color }}><CheckCircle size={14} color="#fff" fill="#fff" strokeWidth={0} /></div>)}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleConfirm} disabled={submitting} className="w-full mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "12px", padding: "17px", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: "0 6px 24px rgba(201,148,58,0.4)", letterSpacing: "0.02em" }}>
              {submitting ? "Traitement en cours…" : `Confirmer et payer ${formatFCFA(total)} →`}
            </button>
            <p className="text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(28,28,28,0.45)" }}>
              En confirmant, vous acceptez nos <span style={{ color: "#C9943A" }}>conditions générales</span>. Annulation gratuite avant 48h.
            </p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 180 }} className="mx-auto mb-8 flex items-center justify-center rounded-full" style={{ width: 100, height: 100, background: "linear-gradient(135deg, #1A3C2E, #2A5C44)", boxShadow: "0 8px 40px rgba(26,60,46,0.3)" }}>
              <CheckCircle size={52} color="#C9943A" fill="none" strokeWidth={1.5} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <p className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#C9943A", letterSpacing: "0.14em", textTransform: "uppercase" }}>Réservation confirmée ✦</p>
              <h1 className="mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "52px", fontWeight: 600, color: "#1A3C2E", lineHeight: 1.1 }}>Bon séjour au Cameroun !</h1>
              <p className="mb-10" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: "rgba(28,28,28,0.6)", lineHeight: 1.7, maxWidth: "500px", margin: "0 auto 40px" }}>
                Votre réservation <strong>{ref}</strong> est confirmée et payée. Retrouvez tous les détails dans « Mes réservations ».
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="rounded-2xl p-7 mb-8 text-left" style={{ background: "#fff", border: "1px solid rgba(26,60,46,0.08)", boxShadow: "0 4px 24px rgba(26,60,46,0.07)" }}>
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "#1C1C1C" }}>Détails de la réservation</h3>
                <span className="px-3 py-1.5 rounded-full" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, color: "#1A3C2E", background: "rgba(26,60,46,0.08)", border: "1px solid rgba(26,60,46,0.15)" }}>#{ref}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                {[{ label: "Hôtel", value: room.hotel }, { label: "Chambre", value: room.name }, { label: "Arrivée", value: checkin }, { label: "Départ", value: checkout }].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#C9943A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1C1C1C", lineHeight: 1.4 }}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-5" style={{ borderTop: "1px solid rgba(26,60,46,0.08)" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, color: "rgba(28,28,28,0.65)" }}>Total payé</span>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 700, color: "#C9943A" }}>{formatFCFA(total)}</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => router.push("/reservations")} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1A3C2E", background: "none", border: "2px solid #1A3C2E", borderRadius: "10px", padding: "12px 28px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                <Download size={16} /> Mes réservations
              </button>
              <button onClick={() => router.push("/")} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: "#1A3C2E", background: "linear-gradient(135deg, #C9943A, #D9A84A)", border: "none", borderRadius: "10px", padding: "12px 28px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", boxShadow: "0 4px 16px rgba(201,148,58,0.35)" }}>
                <Home size={16} /> Retour à l&apos;accueil
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>

      <style>{`
        .bk-label { font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; color:#C9943A; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px; }
        .bk-input { font-family:'DM Sans',sans-serif; font-size:13px; color:#1C1C1C; background:#F7F3EC; border:1px solid rgba(26,60,46,0.15); border-radius:8px; padding:7px 10px; width:100%; outline:none; }
        .bk-step { background:rgba(26,60,46,0.1); border:none; border-radius:4px; width:26px; height:26px; cursor:pointer; font-size:15px; color:#1A3C2E; }
      `}</style>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F7F3EC" }} />}>
      <BookingInner />
    </Suspense>
  );
}
