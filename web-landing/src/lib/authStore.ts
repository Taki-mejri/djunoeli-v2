import { create } from "zustand";

/**
 * Doit matcher l'enum UserRole côté backend (Prisma).
 * On garde une union de strings pour ne pas dépendre de Prisma côté front.
 */
export type UserRole =
  | "SUPER_ADMIN"
  | "OPERATIONS_MANAGER"
  | "FINANCE_MANAGER"
  | "WAREHOUSE_MANAGER"
  | "CUSTOMER_SUPPORT"
  | "EXPEDITEUR"
  | "LIVREUR"
  | "DISPATCHER";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: string;
};

type AuthState = {
  /** JWT court (15 min). Volontairement EN MÉMOIRE, jamais en localStorage. */
  accessToken: string | null;
  /** Infos publiques du user. */
  user: AuthUser | null;
  /**
   * État de l'initialisation : on a tenté un /auth/refresh au démarrage
   * de l'app, et on connaît le résultat (connecté ou pas).
   * Tant que c'est false, on affiche un spinner global pour éviter le flash de /login.
   */
  initialized: boolean;

  // Actions
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  setInitialized: (v: boolean) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initialized: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setInitialized: (v) => set({ initialized: v }),
  logout: () => set({ accessToken: null, user: null }),
}));

/* ---------- Sélecteurs / helpers ---------- */
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => !!s.accessToken && !!s.user);
export const useIsInitialized = () => useAuthStore((s) => s.initialized);

/** Mappe un rôle vers le chemin de son dashboard */
export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "LIVREUR":
      return "/livreur";
    case "EXPEDITEUR":
      return "/expediteur";
    case "FINANCE_MANAGER":
      return "/finance";
    default:
      return "/admin"; // tous les autres rôles vont sur /admin
  }
}
