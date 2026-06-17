"use client";
// ============================================================
//  KamerStay — contexts/ToastContext.tsx
//  Système de notifications toast global (succès / erreur / info)
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// ── Types ──────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// ── Contexte ───────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

// ── Provider ───────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Affiche un toast.
   * @param message  Texte affiché
   * @param type     "success" | "error" | "info" | "warning"
   * @param duration Durée en ms (défaut : 4000)
   */
  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé dans un <ToastProvider>");
  }
  return ctx;
}
