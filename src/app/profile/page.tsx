"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut, Mail, User as UserIcon, BadgeCheck,
  LayoutDashboard, CalendarCheck, Phone, CreditCard, Upload, Clock, XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { demanderDevenirHote, getStatutVerification, StatutVerification } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();

  const [statutVerif, setStatutVerif] = useState<StatutVerification | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [telephone, setTelephone] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [photoCni, setPhotoCni] = useState<File | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?redirect=/profile");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user && user.role === "CLIENT") {
      getStatutVerification().then(({ data }) => {
        if (data) setStatutVerif(data.statut_verification);
      });
    }
  }, [user]);

  const handleDevenirHote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telephone || !fournisseur || !identifiant || !photoCni) {
      showToast("Tous les champs sont obligatoires, y compris la photo de la CNI.", "error");
      return;
    }
    setSubmitting(true);
    const form = new FormData();
    form.append("telephone", telephone);
    form.append("fournisseur", fournisseur);
    form.append("identifiant", identifiant);
    form.append("photo_cni", photoCni);

    const { data, error } = await demanderDevenirHote(form);
    setSubmitting(false);

    if (error || !data) {
      showToast(error || "Erreur lors de l'envoi de la demande.", "error");
      return;
    }
    showToast(data.message, "success");
    setStatutVerif(data.statut_verification);
    setShowForm(false);
  };

  if (isLoading || !user) {
    return <div className="min-h-screen bg-ivory pt-[120px] mx-auto px-6 max-w-2xl"><div className="skeleton rounded-2xl h-[280px]" /></div>;
  }

  const initials = `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase();
  const isHote = user.role === "HOTE";

  return (
    <div className={styles.pageWrap}>
      <div className={`mx-auto px-6 ${styles.container}`}>
        <div className={`rounded-2xl overflow-hidden mb-6 ${styles.profileCard}`}>
          <div className={styles.banner} />
          <div className="px-8 pb-8" style={{ marginTop: -44 }}>
            <div className={`flex items-center justify-center rounded-full mb-4 ${styles.avatar}`}>{initials}</div>
            <h1 className={styles.userName}>{user.prenom} {user.nom}</h1>
            <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full ${styles.roleBadge}`}>
              <BadgeCheck size={14} color="#C9943A" /> {isHote ? "Compte Hôte" : "Compte Voyageur"}
            </span>
          </div>
        </div>

        <div className={`rounded-2xl p-7 mb-6 ${styles.detailCard}`}>
          <h2 className={`mb-5 ${styles.detailTitle}`}>Mes informations</h2>
          <div className="flex flex-col gap-4">
            {[
              { Icon: UserIcon, label: "Nom complet", value: `${user.prenom} ${user.nom}` },
              { Icon: Mail, label: "Email", value: user.email },
            ].map(({ Icon, label, value }) => (
              <div key={label} className={`flex items-center gap-4 p-4 rounded-xl ${styles.infoRow}`}>
                <div className={`flex items-center justify-center rounded-full flex-shrink-0 ${styles.infoIconWrap}`}><Icon size={18} color="#1A3C2E" /></div>
                <div>
                  <p className={styles.infoLabel}>{label}</p>
                  <p className={styles.infoValue}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {user.role === "CLIENT" && (
          <div className={`rounded-2xl p-7 mb-6 ${styles.detailCard}`}>
            <h2 className={`mb-5 ${styles.detailTitle}`}>Devenir hôte</h2>

            {statutVerif === "EN_ATTENTE" && (
              <div className={`flex items-center gap-3 p-4 rounded-xl ${styles.infoRow}`}>
                <Clock size={18} color="#C9943A" />
                <p className={styles.infoValue}>Votre demande est en attente de validation par un administrateur.</p>
              </div>
            )}

            {statutVerif === "REJETE" && !showForm && (
              <>
                <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 ${styles.infoRow}`}>
                  <XCircle size={18} color="#C4622D" />
                  <p className={styles.infoValue}>Votre demande précédente a été rejetée. Vous pouvez la soumettre à nouveau.</p>
                </div>
                <button onClick={() => setShowForm(true)} className={`rounded-xl px-6 py-3 ${styles.primaryLink}`}>
                  Refaire une demande
                </button>
              </>
            )}

            {(statutVerif === "NON_DEMANDE" || statutVerif === null) && !showForm && (
              <button onClick={() => setShowForm(true)} className={`rounded-xl px-6 py-3 ${styles.primaryLink}`}>
                Devenir hôte
              </button>
            )}

            {showForm && (
              <form onSubmit={handleDevenirHote} className="flex flex-col gap-4">
                <p className={styles.infoLabel} style={{ marginBottom: -8 }}>
                  Renseignez vos informations pour publier des annonces. Un administrateur devra approuver votre compte.
                </p>

                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#F7F3EC" }}>
                  <Phone size={18} color="#1A3C2E" />
                  <input
                    type="tel"
                    placeholder="Numéro de téléphone"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full bg-transparent outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#F7F3EC" }}>
                  <CreditCard size={18} color="#1A3C2E" />
                  <input
                    type="text"
                    placeholder="Fournisseur du compte de paiement (ex: MTN Mobile Money)"
                    value={fournisseur}
                    onChange={(e) => setFournisseur(e.target.value)}
                    className="w-full bg-transparent outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#F7F3EC" }}>
                  <CreditCard size={18} color="#1A3C2E" />
                  <input
                    type="text"
                    placeholder="Identifiant du compte de paiement (ex: numéro)"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    className="w-full bg-transparent outline-none"
                    required
                  />
                </div>

                <label className="flex items-center gap-4 p-4 rounded-xl cursor-pointer" style={{ background: "#F7F3EC" }}>
                  <Upload size={18} color="#1A3C2E" />
                  <span className={styles.infoValue}>
                    {photoCni ? photoCni.name : "Photo de votre CNI (vérification d'identité simulée)"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => setPhotoCni(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </label>

                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className={`flex-1 rounded-xl px-6 py-3 ${styles.primaryLink}`}>
                    {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className={`flex-1 rounded-xl ${styles.logoutBtn}`}>
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={isHote ? "/host/dashboard" : "/reservations"} className={`flex-1 flex items-center justify-center gap-2 rounded-xl ${styles.primaryLink}`}>
            {isHote ? <><LayoutDashboard size={16} /> Espace hôte</> : <><CalendarCheck size={16} /> Mes réservations</>}
          </Link>
          <button onClick={() => signOut()} className={`flex-1 flex items-center justify-center gap-2 rounded-xl ${styles.logoutBtn}`}>
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}