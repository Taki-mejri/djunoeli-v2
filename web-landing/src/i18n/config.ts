import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import frCommon from "./locales/fr/common.json";
import frAuth from "./locales/fr/auth.json";
import deCommon from "./locales/de/common.json";
import deAuth from "./locales/de/auth.json";
import frExpediteur from "./locales/fr/expediteur.json";
import deExpediteur from "./locales/de/expediteur.json";
import frLivreur from "./locales/fr/livreur.json";
import deLivreur from "./locales/de/livreur.json";
import frDispatch from "./locales/fr/dispatch.json";
import deDispatch from "./locales/de/dispatch.json";
import frFinance from "./locales/fr/finance.json";
import deFinance from "./locales/de/finance.json";
import frAdmin from "./locales/fr/admin.json";
import deAdmin from "./locales/de/admin.json";
import frTrack from "./locales/fr/track.json";
import deTrack from "./locales/de/track.json";

/**
 * Configuration i18n — français (défaut) + allemand.
 *
 * Namespaces :
 *  - common : éléments transverses (nav, boutons, statuts, actions...)
 *  - auth   : pages de connexion
 *  - expediteur : espace expéditeur (dashboard, colis, création, détail)
 *  - livreur : espace livreur / PWA (courses, détail, modales, COD, profil)
 *  - dispatch : espace dispatcher (stations de scan, inventaire, assignation à distance)
 *  - finance : espace finance (trésorerie, COD, factures, rapports) + supervision admin
 *  - admin   : espace administrateur (tableau de bord, colis, expéditeurs, livreurs)
 *  - track   : suivi public d'un colis (page /track, sans authentification)
 *
 * Couverture complète : les 5 espaces de l'application sont bilingues FR/DE.
 *
 * Détection : ordre localStorage → navigateur. Le choix manuel est stocké
 * dans localStorage (clé i18nextLng) et prime sur la langue du navigateur.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { common: frCommon, auth: frAuth, expediteur: frExpediteur, livreur: frLivreur, dispatch: frDispatch, finance: frFinance, admin: frAdmin, track: frTrack },
      de: { common: deCommon, auth: deAuth, expediteur: deExpediteur, livreur: deLivreur, dispatch: deDispatch, finance: deFinance, admin: deAdmin, track: deTrack },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "de"],
    defaultNS: "common",
    ns: ["common", "auth", "expediteur", "livreur", "dispatch", "finance", "admin", "track"],
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
