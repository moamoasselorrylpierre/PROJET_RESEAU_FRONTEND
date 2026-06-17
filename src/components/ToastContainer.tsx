"use client";
// ============================================================
//  KamerStay — components/ToastContainer.tsx
//  Affiche les toasts en bas de l'écran
// ============================================================

import { useToast, ToastType } from "@/contexts/ToastContext";

// Couleurs selon le type de toast
const toastStyles: Record<ToastType, string> = {
  success: "bg-green-700 text-white",
  error:   "bg-red-600   text-white",
  warning: "bg-yellow-500 text-white",
  info:    "bg-gray-800  text-white",
};

const toastIcons: Record<ToastType, string> = {
  success: "✅",
  error:   "❌",
  warning: "⚠️",
  info:    "ℹ️",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-5 py-3 rounded-full shadow-lg
            text-sm font-medium pointer-events-auto
            animate-fade-in-up whitespace-nowrap
            ${toastStyles[toast.type]}
          `}
        >
          <span>{toastIcons[toast.type]}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity text-xs font-bold"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
