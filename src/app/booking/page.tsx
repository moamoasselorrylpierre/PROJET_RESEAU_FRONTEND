"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Download, Home } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA, annonceToRoom, type Room } from "@/data/rooms";
import { getAnnonce, createReservation, createPaiement, type ModePaiement } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "./booking.module.css";

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
  const [payPartial, setPayPartial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [ref, setRef] = useState("");

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
  const amountToPay = payPartial ? Math.round(total * 0.5) : total;

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
    const pay = await createPaiement({ reservation_id: reservationId, mode_paiement: mode, paiement_partiel: payPartial });
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
    return <div className="min-h-screen bg-ivory pt-[120px] mx-auto px-6 max-w-3xl"><div className="skeleton rounded-2xl h-[300px]" /></div>;
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-ivory pt-[140px] text-center px-6">
        <h1 className={styles.errorTitle}>Aucune chambre sélectionnée</h1>
        <button onClick={() => router.push("/search")} className={`mt-6 ${styles.errorBtn}`}>Parcourir les hôtels</button>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      <div className={`mx-auto px-6 ${styles.container}`}>
        {!confirmed ? (
          <>
            <div className="text-center mb-10">
              <p className={`mb-2 ${styles.sectionTag}`}>Finaliser la réservation</p>
              <h1 className={styles.pageTitle}>Récapitulatif</h1>
            </div>

            <div className={`rounded-2xl overflow-hidden mb-6 ${styles.summaryCard}`}>
              <div className="flex flex-col md:flex-row">
                <div className={styles.summaryImage}>
                  <ImageWithFallback src={room.image} alt={room.name} className={styles.summaryImg} />
                </div>
                <div className="flex-1 p-7">
                  <p className={styles.summaryHotel}>{room.hotel}</p>
                  <h3 className={styles.summaryName}>{room.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={styles.bkLabel}>Arrivée</p>
                      <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className={styles.bkInput} />
                    </div>
                    <div>
                      <p className={styles.bkLabel}>Départ</p>
                      <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} className={styles.bkInput} />
                    </div>
                    <div>
                      <p className={styles.bkLabel}>Voyageurs</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setGuests((g) => Math.max(1, g - 1))} className={styles.bkStep}>−</button>
                        <span className={styles.guestCount}>{guests}</span>
                        <button onClick={() => setGuests((g) => Math.min(room.guests, g + 1))} className={styles.bkStep}>+</button>
                      </div>
                    </div>
                    <div>
                      <p className={styles.bkLabel}>Durée</p>
                      <p className={styles.durationText}>{nights || "—"} nuit{nights > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className={`mt-5 pt-5 flex items-center justify-between ${styles.totalDivider}`}>
                    <span className={styles.totalLabel}>Total{nights ? ` pour ${nights} nuit${nights > 1 ? "s" : ""}` : ""}</span>
                    <span className={styles.totalAmount}>{formatFCFA(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {total > 0 && (
              <div className={`rounded-2xl p-7 mb-6 ${styles.paymentCard}`}>
                <h3 className={`mb-6 ${styles.paymentTitle}`}>Montant à payer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button type="button" onClick={() => setPayPartial(false)}
                    className={styles.paymentOption}
                    style={{ background: !payPartial ? "#F0F5F2" : "#fff", border: !payPartial ? "2px solid #1A3C2E" : "2px solid rgba(26,60,46,0.1)" }}>
                    <div>
                      <p className={styles.paymentLabel}>Payer la totalité</p>
                      <p className={styles.paymentDesc}>{formatFCFA(total)}</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => setPayPartial(true)}
                    className={styles.paymentOption}
                    style={{ background: payPartial ? "#FFF3EC" : "#fff", border: payPartial ? "2px solid #C4622D" : "2px solid rgba(26,60,46,0.1)" }}>
                    <div>
                      <p className={styles.paymentLabel}>Acompte de 50%</p>
                      <p className={styles.paymentDesc}>{formatFCFA(Math.round(total * 0.5))} maintenant · solde de {formatFCFA(total - Math.round(total * 0.5))} à l&apos;arrivée</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className={`rounded-2xl p-7 mb-6 ${styles.paymentCard}`}>
              <h3 className={`mb-6 ${styles.paymentTitle}`}>Mode de paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((pm) => (
                  <button key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                    className={styles.paymentOption}
                    style={{ background: selectedPayment === pm.id ? pm.bg : "#fff", border: selectedPayment === pm.id ? `2px solid ${pm.color}` : "2px solid rgba(26,60,46,0.1)" }}>
                    <div className={styles.paymentIcon} style={{ background: pm.bg, border: `1px solid ${pm.color}33` }}>{pm.icon}</div>
                    <div>
                      <p className={styles.paymentLabel}>{pm.label}</p>
                      <p className={styles.paymentDesc}>{pm.description}</p>
                    </div>
                    {selectedPayment === pm.id && (<div className={`ml-auto flex-shrink-0 ${styles.paymentCheck}`} style={{ background: pm.color }}><CheckCircle size={14} color="#fff" fill="#fff" strokeWidth={0} /></div>)}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleConfirm} disabled={submitting} className={`w-full mb-4 ${styles.confirmBtn}`}>
              {submitting ? "Traitement en cours…" : `Confirmer et payer ${formatFCFA(amountToPay)}${payPartial ? " (acompte)" : ""} →`}
            </button>
            <p className={styles.termsText}>
              En confirmant, vous acceptez nos <span className={styles.termsLink}>conditions générales</span>. Annulation gratuite avant 48h.
            </p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 180 }} className={`mx-auto mb-8 flex items-center justify-center rounded-full ${styles.confirmIconWrap}`}>
              <CheckCircle size={52} color="#C9943A" fill="none" strokeWidth={1.5} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <p className={`mb-2 ${styles.confirmTag}`}>Réservation confirmée ✦</p>
              <h1 className={`mb-4 ${styles.confirmTitle}`}>Bon séjour au Cameroun !</h1>
              <p className={`mb-10 ${styles.confirmText}`}>
                Votre réservation <strong>{ref}</strong> est confirmée et payée. Retrouvez tous les détails dans « Mes réservations ».
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className={`rounded-2xl p-7 mb-8 text-left ${styles.detailCard}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={styles.detailTitle}>Détails de la réservation</h3>
                <span className={`px-3 py-1.5 rounded-full ${styles.detailRef}`}>#{ref}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                {[{ label: "Hôtel", value: room.hotel }, { label: "Chambre", value: room.name }, { label: "Arrivée", value: checkin }, { label: "Départ", value: checkout }].map(({ label, value }) => (
                  <div key={label}>
                    <p className={styles.detailLabel}>{label}</p>
                    <p className={styles.detailValue}>{value}</p>
                  </div>
                ))}
              </div>
              <div className={`flex items-center justify-between pt-5 ${styles.detailDivider}`}>
                <span className={styles.totalPaidLabel}>{payPartial ? "Acompte payé (50%)" : "Total payé"}</span>
                <span className={styles.totalPaidAmount}>{formatFCFA(amountToPay)}</span>
              </div>
              {payPartial && (
                <div className="flex items-center justify-between pt-2">
                  <span className={styles.totalPaidLabel}>Solde à régler à l&apos;arrivée</span>
                  <span className={styles.totalPaidAmount}>{formatFCFA(total - amountToPay)}</span>
                </div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => router.push("/reservations")} className={styles.secondaryBtn}>
                <Download size={16} /> Mes réservations
              </button>
              <button onClick={() => router.push("/")} className={styles.primaryBtn}>
                <Home size={16} /> Retour à l&apos;accueil
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ivory" />}>
      <BookingInner />
    </Suspense>
  );
}
