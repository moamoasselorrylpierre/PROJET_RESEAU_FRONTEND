// ============================================================
//  KamerStay — app/layout.tsx  (layout racine)
// ============================================================

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastContainer from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: {
    default: "KamerStay — Découvrez le Cameroun, une chambre à la fois",
    template: "%s | KamerStay",
  },
  description:
    "Plateforme de réservation hôtelière de luxe au Cameroun. Trouvez, réservez et payez en FCFA en toute sécurité.",
  keywords: ["location", "chambre", "hôtel", "réservation", "Cameroun", "FCFA"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
