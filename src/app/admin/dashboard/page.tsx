"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, Home, Clock, Check, X, MapPin, Star, ShieldPlus } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatFCFA } from "@/data/rooms";
import { imageUrl } from "@/lib/images";
import {
  getUtilisateursAdmin, approuverUtilisateur, rejeterUtilisateur,
  getAnnoncesAdmin, supprimerAnnonceAdmin, getAdmins, creerAdmin,
  type UtilisateurAdmin, type Annonce, type AdminCompte,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "./admin-dashboard.module.css";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useToast();

  const isSuperAdmin = !!user?.est_super_admin;
  const [tab, setTab] = useState<"comptes" | "annonces" | "admins">("comptes");
  const [demandes, setDemandes] = useState<UtilisateurAdmin[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [admins, setAdmins] = useState<AdminCompte[]>([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", nom: "", prenom: "", motDePasse: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, a] = await Promise.all([
      getUtilisateursAdmin({ statut_verification: "EN_ATTENTE" }),
      getAnnoncesAdmin(),
    ]);
    setDemandes(d.data || []);
    setAnnonces(a.data || []);
    if (user?.est_super_admin) {
      const ad = await getAdmins();
      setAdmins(ad.data || []);
    }
    setLoading(false);
  }, [user?.est_super_admin]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.replace("/login?redirect=/admin/dashboard"); return; }
    if (!isLoading && user && user.role !== "ADMINISTRATEUR") { showToast("Espace réservé aux administrateurs.", "info"); router.replace("/"); return; }
    if (isAuthenticated && user?.role === "ADMINISTRATEUR") load();
  }, [isLoading, isAuthenticated, user, router, load, showToast]);

  async function approve(u: UtilisateurAdmin) {
    const { error } = await approuverUtilisateur(u.id);
    if (error) { showToast(error, "error"); return; }
    showToast(`${u.prenom} ${u.nom} est désormais hôte.`, "success"); load();
  }

  async function reject(u: UtilisateurAdmin) {
    if (!confirm(`Rejeter la demande de ${u.prenom} ${u.nom} ?`)) return;
    const { error } = await rejeterUtilisateur(u.id);
    if (error) { showToast(error, "error"); return; }
    showToast("Demande rejetée.", "info"); load();
  }

  async function removeAnnonce(a: Annonce) {
    if (!confirm(`Supprimer l'annonce « ${a.titre} » ?`)) return;
    const { error } = await supprimerAnnonceAdmin(a.id);
    if (error) { showToast(error, "error"); return; }
    showToast("Annonce supprimée.", "info"); load();
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.nom || !newAdmin.prenom || !newAdmin.motDePasse) {
      showToast("Tous les champs sont obligatoires.", "error"); return;
    }
    setCreatingAdmin(true);
    const { error } = await creerAdmin(newAdmin);
    setCreatingAdmin(false);
    if (error) { showToast(error, "error"); return; }
    showToast("Administrateur créé.", "success");
    setNewAdmin({ email: "", nom: "", prenom: "", motDePasse: "" });
    load();
  }

  return (
    <div className={styles.pageWrap}>
      <div className={`mx-auto px-6 ${styles.container}`}>
        <div className="mb-8">
          <p className={`mb-1 ${styles.sectionTag}`}>Espace admin</p>
          <h1 className={styles.pageTitle}>Tableau de bord</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { Icon: Clock, label: "Demandes en attente", value: demandes.length },
            { Icon: Home, label: "Annonces publiées", value: annonces.length },
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
          {(([
            ["comptes", "Comptes à valider"],
            ["annonces", "Annonces"],
            ...(isSuperAdmin ? [["admins", "Administrateurs"]] : []),
          ]) as [("comptes" | "annonces" | "admins"), string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`${styles.tabBtn} ${tab === t ? styles.tabActive : styles.tabInactive}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">{[...Array(2)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-[120px]" />)}</div>
        ) : tab === "comptes" ? (
          demandes.length === 0 ? (
            <Empty title="Aucune demande" text="Les demandes pour devenir hôte apparaîtront ici." icon={Users} />
          ) : (
            <div className="flex flex-col gap-4">
              {demandes.map((u) => (
                <div key={u.id} className={`rounded-2xl p-6 ${styles.itemCard}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className={styles.itemTitle}>{u.prenom} {u.nom}</h3>
                    <span className={styles.statusBadge} style={{ color: "#9A6B00", background: "#FCEFC7" }}>En attente</span>
                  </div>
                  <div className={`flex flex-wrap gap-4 mb-3 ${styles.itemMeta}`}>
                    <span>✉️ {u.email}</span>
                    <span>📞 {u.telephone || "—"}</span>
                    <span>💳 {u.compte_paiement_fournisseur} — {u.compte_paiement_identifiant}</span>
                  </div>
                  <div className={`flex items-center justify-between pt-3 ${styles.divider}`}>
                    {u.photo_cni ? (
                      <a href={imageUrl(u.photo_cni)} target="_blank" rel="noopener noreferrer" className={styles.cniLink}>
                        Voir la pièce d&apos;identité
                      </a>
                    ) : <span />}
                    <div className="flex gap-2">
                      <button onClick={() => reject(u)} className={`flex items-center gap-1.5 ${styles.btnOutline}`}>
                        <X size={14} /> Rejeter
                      </button>
                      <button onClick={() => approve(u)} className={`flex items-center gap-1.5 ${styles.btnPrimary}`}>
                        <Check size={14} /> Approuver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === "annonces" ? (
          annonces.length === 0 ? (
            <Empty title="Aucune annonce" text="Les annonces publiées par les hôtes apparaîtront ici." icon={Home} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {annonces.map((a) => (
                <div key={a.id} className={`rounded-2xl overflow-hidden flex flex-col ${styles.itemCard}`}>
                  <div className="relative h-[140px]">
                    <ImageWithFallback src={imageUrl(a.images?.[0])} alt={a.titre} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className={`mb-1 ${styles.itemTitle}`}>{a.titre}</h3>
                    <div className={`flex flex-wrap gap-3 mb-3 ${styles.itemMeta}`}>
                      <span className="flex items-center gap-1"><MapPin size={13} color="#C4622D" />{[a.quartier, a.ville].filter(Boolean).join(", ")}</span>
                      <span className="flex items-center gap-1"><Star size={13} fill="#C9943A" color="#C9943A" />{Number(a.note_moyenne || 0).toFixed(1)} ({a.nb_avis || 0})</span>
                      <span>Hôte : {a.hote_prenom} {a.hote_nom}</span>
                    </div>
                    <div className={`mt-auto flex items-center justify-between pt-3 ${styles.divider}`}>
                      <span className={styles.itemPrice}>{formatFCFA(Number(a.prixparnuit ?? a.prix ?? 0))}</span>
                      <button onClick={() => removeAnnonce(a)} className={styles.btnOutline}>Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-6">
            <form onSubmit={addAdmin} className={`rounded-2xl p-6 ${styles.itemCard} flex flex-col gap-4`}>
              <h3 className={styles.itemTitle}>Créer un administrateur</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={styles.adminInput} placeholder="Prénom" value={newAdmin.prenom} onChange={(e) => setNewAdmin({ ...newAdmin, prenom: e.target.value })} />
                <input className={styles.adminInput} placeholder="Nom" value={newAdmin.nom} onChange={(e) => setNewAdmin({ ...newAdmin, nom: e.target.value })} />
                <input className={styles.adminInput} type="email" placeholder="Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
                <input className={styles.adminInput} type="password" placeholder="Mot de passe (min. 6)" value={newAdmin.motDePasse} onChange={(e) => setNewAdmin({ ...newAdmin, motDePasse: e.target.value })} />
              </div>
              <button type="submit" disabled={creatingAdmin} className={`flex items-center gap-1.5 self-start ${styles.btnPrimary}`}>
                <ShieldPlus size={15} /> {creatingAdmin ? "Création…" : "Créer l'administrateur"}
              </button>
            </form>

            {admins.length === 0 ? (
              <Empty title="Aucun administrateur" text="Les comptes administrateurs apparaîtront ici." icon={Users} />
            ) : (
              <div className="flex flex-col gap-3">
                {admins.map((ad) => (
                  <div key={ad.id} className={`rounded-2xl p-5 flex items-center justify-between ${styles.itemCard}`}>
                    <div>
                      <h3 className={styles.itemTitle}>{ad.prenom} {ad.nom}</h3>
                      <span className={styles.itemMeta}>✉️ {ad.email}</span>
                    </div>
                    {ad.est_super_admin && (
                      <span className={styles.statusBadge} style={{ color: "#1A3C2E", background: "#D7EBDD" }}>Super-admin</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ title, text, icon: Icon }: { title: string; text: string; icon: React.ComponentType<{ size?: number; color?: string }> }) {
  return (
    <div className={`text-center rounded-2xl p-12 ${styles.emptyCard}`}>
      <div className="flex justify-center mb-3"><Icon size={32} color="#C9943A" /></div>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
    </div>
  );
}