import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // v2 tourne sur 5174 pour cohabiter avec le v1 (5173)
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Djunoeli Livreur",
        short_name: "Djunoeli",
        description: "Djunoeli Fahrer-App — Same-Day-Lieferungen in Dortmund verwalten.",
        theme_color: "#0d2a47",
        background_color: "#0d2a47",
        display: "standalone",
        orientation: "portrait",
        start_url: "/livreur",
        scope: "/",
        lang: "de",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
});
