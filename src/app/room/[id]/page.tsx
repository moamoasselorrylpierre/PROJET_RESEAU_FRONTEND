"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Star, MapPin, Wifi, Wind, Coffee, Waves, Shield, Tv, Droplets,
  Eye, ArrowLeft, ChevronLeft, ChevronRight, Users, Maximize2, Car, Utensils,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA, annonceToRoom, fallbackRooms, type Room } from "@/data/rooms";
import {
  getAnnonce, getAvis, getMesReservations, getPeutNoter, createAvis,
  type AvisItem, type Reservation,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "../room.module.css";

const allAmenities: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi size={18} />, label: "WiFi haut débit" },
  ac: { icon: <Wind size={18} />, label: "Climatisation" },
  breakfast: { icon: <Coffee size={18} />, label: "Petit-déjeuner inclus" },
  pool: { icon: <Waves size={18} />, label: "Piscine" },
  restaurant: { icon: <span className="text-base">🍽</span>, label: "Restaurant" },
  security: { icon: <Shield size={18} />, label: "Sécurité 24h" },
  tv: { icon: <Tv size={18} />, label: "Télévision" },
  shower: { icon: <Droplets size={18} />, label: "Eau chaude" },
  view: { icon: <Eye size={18} />, label: "Vue panoramique" },
  parking: { icon: <Car size={18} />, label: "Parking" },
  kitchen: { icon: <Utensils size={18} />, label: "Cuisine" },
};

interface DisplayReview { name: string; city: string; rating: number; date: string; text: string }

const staticReviews: DisplayReview[] = [
  { name: "Prisca M.", city: "Yaoundé", rating: 5, date: "Mars 2026", text: "Absolument splendide. Le service était irréprochable et la vue est à couper le souffle. Je reviendrai assurément." },
  { name: "Thomas G.", city: "Paris", rating: 4, date: "Février 2026", text: "Beautiful hotel with great amenities. The staff were incredibly helpful. Breakfast was amazing with local dishes." },
];

export default function RoomDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [reviews, setReviews] = useState<DisplayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "amenities" | "reviews" | "location">("description");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);

  const [eligibleReservation, setEligibleReservation] = useState<Reservation | null>(null);
  const [ratingNote, setRatingNote] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await getAnnonce(id!);
      if (data) {
        setRoom(annonceToRoom(data));
        const avisRes = await getAvis(id!);
        const list = (avisRes.data?.avis || []) as AvisItem[];
        if (list.length) {
          setReviews(list.map((a) => ({
            name: [a.client_prenom, a.client_nom].filter(Boolean).join(" ") || "Client",
            city: "", rating: a.note,
            date: a.dateevaluation ? new Date(a.dateevaluation).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "",
            text: a.commentaire || "—",
          })));
        } else setReviews(staticReviews);
      } else {
        setRoom(fallbackRooms[0]);
        setReviews(staticReviews);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated || !user || user.role !== "CLIENT" || !id) return;

      const { data: reservations } = await getMesReservations();
      const candidates = (reservations || [])
        .filter((r) => String(r.annonce_id) === String(id) && (r.statut === "CONFIRMEE" || r.statut === "TERMINEE"));

      for (const candidate of candidates) {
        const { data } = await getPeutNoter(candidate.idreservation);
        if (data?.peut_noter) {
          setEligibleReservation(candidate);
          break;
        }
      }
    })();
  }, [id, user, isAuthenticated]);

  const handleSubmitRating = async () => {
    if (!eligibleReservation) return;
    if (ratingNote < 1) {
      showToast("Sélectionnez une note en étoiles avant d'envoyer.", "error");
      return;
    }
    setRatingSubmitting(true);
    const { data, error } = await createAvis({
      reservation_id: eligibleReservation.idreservation,
      note: ratingNote,
      commentaire: ratingComment || undefined,
    });
    setRatingSubmitting(false);

    if (error || !data) {
      showToast(error || "Erreur lors de l'envoi de votre avis.", "error");
      return;
    }

    showToast("Merci pour votre avis !", "success");
    setReviews((prev) => [
      {
        name: [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Vous",
        city: "", rating: ratingNote,
        date: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        text: ratingComment || "—",
      },
      ...prev,
    ]);
    setEligibleReservation(null);
    setRatingNote(0);
    setRatingComment("");
  };

  if (loading || !room) {
    return <div className={styles.loading + " mx-auto px-6 max-w-5xl"}>
      <div className="skeleton rounded-2xl h-[420px]" />
    </div>;
  }

  const nights = checkin && checkout
    ? Math.max(1, Math.ceil((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 2;
  // Équipements réels de l'annonce (point 16) ; on n'ajoute plus de faux équipements
  const amenityList = room.amenities.filter((v, i, a) => a.indexOf(v) === i);

  function goBooking() {
    const p = new URLSearchParams({ room: String(room!.id), guests: String(guests) });
    if (checkin) p.set("checkin", checkin);
    if (checkout) p.set("checkout", checkout);
    router.push(`/booking?${p.toString()}`);
  }

  return (
    <div className={styles.pageWrap}>
      <div className={`mx-auto px-6 pt-6 pb-2 ${styles.container}`}>
        <button onClick={() => router.back()} className={`flex items-center gap-2 ${styles.backBtn}`}>
          <ArrowLeft size={16} /> Retour aux résultats
        </button>
      </div>

      <div className={`mx-auto px-6 pb-8 ${styles.container}`}>
        <div className={`relative rounded-2xl overflow-hidden mb-3 ${styles.galleryWrap}`}>
          <ImageWithFallback src={room.images[activeImage]} alt={room.name} className="w-full h-full object-cover" />
          {room.images.length > 1 && (
            <>
              <button onClick={() => setActiveImage((p) => (p - 1 + room.images.length) % room.images.length)}
                className={`absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full ${styles.galleryNavBtn}`}><ChevronLeft size={22} color="#1A3C2E" /></button>
              <button onClick={() => setActiveImage((p) => (p + 1) % room.images.length)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full ${styles.galleryNavBtn}`}><ChevronRight size={22} color="#1A3C2E" /></button>
            </>
          )}
          {room.badge && (<div className={`absolute top-5 left-5 px-3 py-1.5 rounded-full ${styles.galleryBadge}`}>{room.badge}</div>)}
          <div className={`absolute bottom-5 right-5 px-3 py-1.5 rounded-full ${styles.galleryCounter}`}>{activeImage + 1} / {room.images.length}</div>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {room.images.map((img, i) => (
            <button key={i} onClick={() => setActiveImage(i)} className={styles.thumbBtn}
              style={{ border: i === activeImage ? "2px solid #C9943A" : "2px solid transparent" }}>
              <ImageWithFallback src={img} alt={`Vue ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className={`mx-auto px-6 pb-20 flex flex-col lg:flex-row gap-10 ${styles.container}`}>
        <div className="flex-1">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className={styles.roomHotel}>{room.hotel}</span>
              <div className="flex items-center gap-0.5">{[...Array(room.stars)].map((_, i) => (<Star key={i} size={13} fill="#C9943A" color="#C9943A" strokeWidth={0} />))}</div>
            </div>
            <h1 className={`mb-3 ${styles.roomName}`}>{room.name}</h1>
            <div className="flex items-center gap-5 flex-wrap">
              <div className={`flex items-center gap-1.5 ${styles.roomLocation}`}><MapPin size={15} color="#C4622D" />{room.location}</div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${styles.roomRatingBadge}`}>
                  <Star size={12} fill="#1A3C2E" color="#1A3C2E" />
                  <span className={styles.roomRatingText}>{room.rating || "Nouveau"}</span>
                </div>
                <span className={styles.roomReviews}>{room.reviews} avis</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 ${styles.roomMeta}`}><Users size={14} />{room.guests} personnes</div>
                <div className={`flex items-center gap-1.5 ${styles.roomMeta}`}><Maximize2 size={14} />{room.size} m²</div>
              </div>
            </div>
          </div>

          <div className={styles.tabBar}>
            {(["description", "amenities", "reviews", "location"] as const).map((tab) => {
              const labels = { description: "Description", amenities: "Équipements", reviews: "Avis", location: "Localisation" };
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : styles.tabInactive}`}>{labels[tab]}</button>
              );
            })}
          </div>

          {activeTab === "description" && (
            <div className={styles.contentCard + " p-8"}>
              <p className={styles.contentText}>{room.description}</p>
            </div>
          )}

          {activeTab === "amenities" && (
            <div className={styles.contentCard + " p-8"}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {amenityList.map((key) => {
                  const a = allAmenities[key]; if (!a) return null;
                  return (
                    <div key={key} className={`flex items-center gap-3 p-4 rounded-xl ${styles.amenityItem}`}>
                      <div className={`flex items-center justify-center rounded-full flex-shrink-0 ${styles.amenityIconWrap}`}>{a.icon}</div>
                      <span className={styles.amenityLabel}>{a.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="flex flex-col gap-5">
              <div className={`rounded-2xl p-7 flex gap-8 items-center ${styles.reviewSummary}`}>
                <div className="text-center">
                  <div className={styles.reviewScore}>{room.rating || "—"}</div>
                  <div className="flex justify-center my-2">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} size={16} fill={n <= Math.round(room.rating) ? "#C9943A" : "none"} color="#C9943A" strokeWidth={1.5} className={n <= Math.round(room.rating) ? "opacity-100" : "opacity-30"} />))}</div>
                  <div className={styles.reviewCount}>{room.reviews} avis</div>
                </div>
              </div>
              {eligibleReservation && (
                <div className={`rounded-2xl p-6 ${styles.ratingFormCard}`}>
                  <h3 className={`mb-4 ${styles.ratingFormTitle}`}>Laisser un avis sur votre séjour</h3>
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={styles.starBtn}
                        onMouseEnter={() => setRatingHover(n)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => setRatingNote(n)}
                        aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                      >
                        <Star
                          size={28}
                          fill={n <= (ratingHover || ratingNote) ? "#C9943A" : "none"}
                          color="#C9943A"
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Partagez votre expérience (optionnel)"
                    rows={3}
                    className={`mb-4 ${styles.ratingTextarea}`}
                  />
                  <button
                    onClick={handleSubmitRating}
                    disabled={ratingSubmitting}
                    className={styles.ratingSubmitBtn}
                  >
                    {ratingSubmitting ? "Envoi en cours…" : "Publier mon avis"}
                  </button>
                </div>
              )}

              {reviews.map((rev, i) => (
                <div key={i} className={`rounded-2xl p-6 ${styles.reviewCard}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center rounded-full ${styles.reviewAvatar}`}>{rev.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                      <div>
                        <p className={styles.reviewName}>{rev.name}</p>
                        <p className={styles.reviewMeta}>{[rev.city, rev.date].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} size={13} fill={n <= rev.rating ? "#C9943A" : "none"} color="#C9943A" strokeWidth={1.5} className={n <= rev.rating ? "opacity-100" : "opacity-30"} />))}</div>
                  </div>
                  <p className={styles.reviewText}>&ldquo;{rev.text}&rdquo;</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "location" && (
            <div className={`rounded-2xl overflow-hidden ${styles.locationWrap}`}>
              <div className={`relative flex items-center justify-center ${styles.locationMap}`}>
                <div className="relative text-center">
                  <div className={`mx-auto mb-4 flex items-center justify-center rounded-full ${styles.locationIconWrap}`}><MapPin size={28} color="#C9943A" /></div>
                  <p className={styles.locationName}>{room.location}</p>
                  <p className={styles.locationMeta}>{room.hotel}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-2xl p-7 flex-shrink-0 ${styles.widget}`}>
          <div className="flex items-baseline gap-1.5 mb-6">
            <span className={styles.widgetPrice}>{formatFCFA(room.price)}</span>
            <span className={styles.widgetPeriod}>/ nuit</span>
          </div>
          <div className="flex flex-col gap-3 mb-4">
            {[{ label: "Arrivée", value: checkin, setter: setCheckin }, { label: "Départ", value: checkout, setter: setCheckout }].map(({ label, value, setter }) => (
              <div key={label}>
                <label className={styles.widgetLabel}>{label}</label>
                <input type="date" value={value} onChange={(e) => setter(e.target.value)} className={styles.widgetInput} />
              </div>
            ))}
            <div>
              <label className={styles.widgetLabel}>Voyageurs</label>
              <div className={`flex items-center gap-3 ${styles.guestStepper}`}>
                <button onClick={() => setGuests(Math.max(1, guests - 1))} className={styles.guestBtn}>−</button>
                <span className={`flex-1 text-center ${styles.guestCount}`}>{guests} personne{guests > 1 ? "s" : ""}</span>
                <button onClick={() => setGuests(Math.min(room.guests, guests + 1))} className={styles.guestBtn}>+</button>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 mb-4 ${styles.totalBox}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={styles.totalLine}>{formatFCFA(room.price)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
              <span className={styles.totalLine}>{formatFCFA(room.price * nights)}</span>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(26,60,46,0.1)" }}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.totalPrice}>{formatFCFA(room.price * nights)}</span>
            </div>
          </div>
          <button onClick={goBooking} className={`w-full mb-3 ${styles.widgetBtn}`}>Réserver maintenant</button>
          <p className={`text-center ${styles.widgetNote}`}>✓ Annulation gratuite avant 48h</p>
        </div>
      </div>
    </div>
  );
}