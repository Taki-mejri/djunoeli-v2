import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "./authStore";

/**
 * Client HTTP de Djunoeli.
 *
 * - withCredentials: true → envoie automatiquement le cookie HttpOnly du refresh
 * - Intercepteur de requête : ajoute "Authorization: Bearer <accessToken>"
 * - Intercepteur de réponse : sur un 401, tente UNE fois /auth/refresh
 *   puis rejoue la requête originale (transparent pour l'utilisateur)
 */

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/* ------------ Intercepteur de requête : injecte le token ------------ */
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ------------ Intercepteur de réponse : auto-refresh sur 401 ------------ */

// Verrou : si plusieurs requêtes échouent en 401 en même temps, on ne fait
// qu'UN seul refresh, et les autres attendent.
let isRefreshing = false;
let waitQueue: Array<(token: string | null) => void> = [];

const drainQueue = (token: string | null) => {
  waitQueue.forEach((cb) => cb(token));
  waitQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // Pas un 401 → on remonte tel quel
    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    // Évite la boucle infinie sur les routes d'auth elles-mêmes
    if (original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // Déjà retenté → on abandonne
    if (original._retry) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
    original._retry = true;

    // Si un refresh est déjà en cours, on attend qu'il se termine
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }
          if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    // Lance le refresh
    isRefreshing = true;
    try {
      const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
      const newToken = data.accessToken;
      useAuthStore.getState().setAccessToken(newToken);
      drainQueue(newToken);
      if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      drainQueue(null);
      useAuthStore.getState().logout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
