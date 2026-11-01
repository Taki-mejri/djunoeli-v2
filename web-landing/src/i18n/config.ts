import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import deCommon from "./locales/de/common.json";
import enCommon from "./locales/en/common.json";
import deAuth from "./locales/de/auth.json";
import enAuth from "./locales/en/auth.json";
import deExpediteur from "./locales/de/expediteur.json";
import enExpediteur from "./locales/en/expediteur.json";
import deLivreur from "./locales/de/livreur.json";
import enLivreur from "./locales/en/livreur.json";
import deFinance from "./locales/de/finance.json";
import enFinance from "./locales/en/finance.json";
import deAdmin from "./locales/de/admin.json";
import enAdmin from "./locales/en/admin.json";
import deTrack from "./locales/de/track.json";
import enTrack from "./locales/en/track.json";
import deWallet from "./locales/de/wallet.json";
import enWallet from "./locales/en/wallet.json";

// Les fichiers locales/fr/*.json restent sur disque (héritage v1) mais ne sont plus chargés.

/**
 * Configuration i18n — allemand (défaut) + anglais.
 *
 * Namespaces :
 *  - common : éléments transverses (nav, boutons, statuts, actions...)
 *  - auth   : pages de connexion
 *  - expediteur : espace expéditeur (dashboard, colis, création, détail)
 *  - livreur : espace livreur / PWA (courses, détail, modales, COD, profil)
 *  - finance : espace finance (trésorerie, COD, factures, rapports) + supervision admin
 *  - admin   : espace administrateur (tableau de bord, colis, expéditeurs, livreurs)
 *  - track   : suivi public d'un colis (page /track, sans authentification)
 *  - wallet  : portefeuille expéditeur (solde, historique) + gestion admin des soldes
 *
 * Couverture complète : les 5 espaces de l'application sont bilingues DE/EN.
 *
 * Détection : ordre localStorage → navigateur. Le choix manuel est stocké
 * dans localStorage (clé i18nextLng) et prime sur la langue du navigateur.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { common: deCommon, auth: deAuth, expediteur: deExpediteur, livreur: deLivreur, finance: deFinance, admin: deAdmin, track: deTrack, wallet: deWallet },
      en: { common: enCommon, auth: enAuth, expediteur: enExpediteur, livreur: enLivreur, finance: enFinance, admin: enAdmin, track: enTrack, wallet: enWallet },
    },
    fallbackLng: "de",
    supportedLngs: ["de", "en"],
    // "de-DE" → "de", "en-US" → "en" (sinon un navigateur en-US tomberait sur le fallback)
    nonExplicitSupportedLngs: true,
    defaultNS: "common",
    ns: ["common", "auth", "expediteur", "livreur", "finance", "admin", "track", "wallet"],
    detection: {
      // localStorage d'abord (choix manuel mémorisé), puis langue du navigateur
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React échappe déjà
    },
    react: {
      useSuspense: false, // évite d'avoir à wrapper dans <Suspense>
    },
  });

export default i18n;
