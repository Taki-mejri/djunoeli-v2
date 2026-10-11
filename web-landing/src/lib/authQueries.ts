import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuthStore, type AuthUser } from "./authStore";

/* ---------------- Types des réponses backend ---------------- */

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type RefreshResponse = { accessToken: string };

/* ---------------- LOGIN ---------------- */

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post<LoginResponse>("/auth/login", input);
      return data;
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}

/* ---------------- LOGOUT ---------------- */

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post("/auth/logout");
      } catch {
        // même si le serveur échoue, on nettoie côté client
      }
    },
    onSettled: () => {
      logout();
      qc.clear(); // vide tous les caches React Query
    },
  });
}

/* ---------------- BOOTSTRAP (au démarrage de l'app) ----------------
 *
 * Tente un /auth/refresh + récupère le user via /auth/me.
 * - Si le cookie HttpOnly est valide → l'utilisateur reste connecté après F5.
 * - Sinon → silencieusement non connecté.
 */
export async function bootstrapAuth() {
  const store = useAuthStore.getState();
  try {
    const { data: refresh } = await api.post<RefreshResponse>("/auth/refresh");
    // On a un nouveau access token, on le pose AVANT d'appeler /me
    store.setAccessToken(refresh.accessToken);
    const { data: me } = await api.get<{ user: AuthUser }>("/auth/me");
    store.setSession(refresh.accessToken, me.user);
  } catch {
    // Pas de session valide — c'est OK, l'utilisateur se connectera
    store.logout();
  } finally {
    store.setInitialized(true);
  }
}
