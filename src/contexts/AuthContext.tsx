"use client";
// ============================================================
//  NidiRoom — contexts/AuthContext.tsx
//  Fournit l'état de session à toute l'application
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

// User vient de api.ts (source unique de vérité)
import { User, logout as apiLogout } from "@/lib/api";

// Les helpers de stockage viennent de auth.ts
import {
  getUser,
  getToken,
  saveToken,
  saveUser,
  removeToken,
  removeUser,
  isTokenExpired,
} from "@/lib/auth";

import { socketService } from "@/lib/socket";

// ── Types ──────────────────────────────────────────────────

interface AuthContextType {
  user:            User | null;
  token:           string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  setSession:      (token: string, user: User) => void;
  clearSession:    () => Promise<void>;
}

// ── Contexte ───────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaure la session au montage
  useEffect(() => {
    const storedToken = getToken();
    const storedUser  = getUser();

    if (storedToken && storedUser && !isTokenExpired()) {
      setToken(storedToken);
      setUser(storedUser);
      socketService.connect(storedUser.id).catch(() => {
        console.warn("[AuthContext] WebSocket non disponible au démarrage");
      });
    } else {
      removeToken();
      removeUser();
    }
    setIsLoading(false);
  }, []);

  // Sauvegarder une session après login / register
  const setSession = useCallback((newToken: string, newUser: User) => {
    saveToken(newToken);
    saveUser(newUser);
    setToken(newToken);
    setUser(newUser);
    socketService.connect(newUser.id).catch(() => {
      console.warn("[AuthContext] WebSocket non disponible");
    });
  }, []);

  // Effacer la session (déconnexion)
  const clearSession = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Déconnexion côté client même si serveur indisponible
    } finally {
      socketService.disconnect();
      removeToken();
      removeUser();
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        setSession,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  }
  return ctx;
}
