/**
 * Étape 6/6 — Vérification i18n de l'espace Admin (FR / DE) + taglines de login
 *
 * Couvre a) → i) :
 *   a) login admin
 *   b) FR : dashboard, colis, expéditeurs, livreurs
 *   c) DE : sidebar, dashboard, colis (+ Ferndispatch, statuts), expéditeurs, livreurs (véhicules)
 *   d) formulaires d'ajout expéditeur / livreur en DE
 *   e) taglines des 5 pages de login en DE (et bascule FR)
 *   f) rebascule FR
 *   g) npm run build (vérifié hors navigateur, voir le rapport)
 *   h) 390px lisible
 *   i) aucun missingKey / aucune clé brute / aucun texte FR résiduel
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const SS_DIR = path.join(__dirname, "screenshots-admin-i18n");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const f = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, f), fullPage: false });
  console.log(`  [ss] ${f}`);
};

const RESULTS = [];
const pass = (id, d) => { RESULTS.push({ id, ok: true, d }); console.log(`  OK   ${id}: ${d}`); };
const fail = (id, d) => { RESULTS.push({ id, ok: false, d }); console.log(`  FAIL ${id}: ${d}`); };

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const txt = async (page, sel) => norm(await page.textContent(sel).catch(() => ""));
const body = async (page) => norm(await page.textContent(".ds-content").catch(() => ""));
const sidebar = async (page) => norm(await page.textContent(".ds-sidebar, aside").catch(() => ""));

/* Session mise en cache : le backend limite les logins à 5 / 15 min / IP. */
const ADM_STATE = path.join(__dirname, ".admin-i18n-state.json");
const stateOpts = (f) => (fs.existsSync(f) ? { storageState: f } : {});

async function switchLang(page, code) {
  await page.click(".ds-topbar .lang-btn, .auth-topline .lang-btn");
  await page.click(`.lang-menu .lang-item:has-text("${code === "de" ? "Deutsch" : "Français"}")`);
  await page.waitForTimeout(700);
}

async function goto(page, href) {
  await page.click(`.ds-nav a[href="${href}"]`);
  await page.waitForTimeout(1500);
}

/* Mots FR interdits dans l'UI allemande (mots entiers, pour éviter les faux
   positifs sur les données : villes tunisiennes, noms de sociétés, DT...). */
const FR_WORDS = [
  "Tableau de bord", "Colis au total", "Livrés aujourd'hui", "En cours de livraison", "Revenus (mois)",
  "Livraisons par jour", "Livraisons par région", "derniers jours", "Ce mois",
  "Activité récente", "Tout voir", "Taux de réussite", "Livrées", "Échouées",
  "Nouveau colis", "Expéditeurs", "Livreurs", "Destinataire", "Statut", "Prix",
  "Créé", "Assigner à distance", "Tous les statuts", "Chargement", "Précédent",
  "Suivant", "résultats", "Nouvel expéditeur", "Ajouter un livreur", "Rechercher",
  "Société", "Ville", "Solde", "Véhicule", "Note", "Actif", "En attente", "Suspendu",
  "Moto", "Camionnette", "Voiture", "Camion", "Disponible", "Occupé", "Hors ligne",
  "Annuler", "Créer", "Mot de passe", "Téléphone", "Prénom", "Nom de la société",
  "Principal", "Gestion", "Système", "Entrepôts", "Clients", "Suivi en direct",
  "Assignation", "Paramètres", "Livré", "Ramassé", "Au dépôt", "En route",
];
/*
 * Comparaison par MOTS ENTIERS : `includes` donnait des faux positifs
 * (« Moto » est contenu dans « Motorrad », « Auto » dans « Automatik »...).
 */
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const frHits = (s) =>
  FR_WORDS.filter((w) => new RegExp("(^|[^\\p{L}])" + esc(w) + "([^\\p{L}]|$)", "u").test(s));

/* Clés i18n non résolues : i18next rend la clé brute si elle manque. */
const KEY_ROOTS = ["dashboard", "shipments", "expediteurs", "livreurs", "nav", "layout",
  "common", "actions", "status", "livreurStatus", "pagination", "table", "topbar",
  "taglines", "taglineBullets", "roles", "spaces", "login", "validation"];
const rawKeys = (s) =>
  (s.match(/\b[a-zA-Z]+(?:\.[a-z][a-zA-Z]*)+\b/g) || [])
    .filter((k) => KEY_ROOTS.includes(k.split(".")[0]));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...stateOpts(ADM_STATE) });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const missingKeys = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/missingKey|i18next::translator/i.test(t)) missingKeys.push(t);
    else if (m.type() === "error") consoleErrors.push(t);
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  try {
    // ============ a) LOGIN ============
    console.log("\n--- a) Login admin ---");
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("i18nextLng", "fr"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    if (page.url().includes("/login")) {
      await page.fill('input[type="email"]', "admin@djunoeli.tn");
      await page.fill('input[type="password"]', "Djunoeli2026");
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"), { timeout: 20000 });
    }
    await page.waitForTimeout(1800);
    await ctx.storageState({ path: ADM_STATE });
    pass("a", `connecte admin -> ${new URL(page.url()).pathname}`);

    // ============ b) FR ============
    console.log("\n--- b) Les 4 pages en francais ---");
    const frPages = [["dashboard", await txt(page, ".ds-page-head h1")]];
    await ss(page, "fr-dashboard");
    for (const [href, name] of [["/admin/shipments", "colis"], ["/admin/expediteurs", "expediteurs"],
                                ["/admin/drivers", "livreurs"]]) {
      await goto(page, href);
      frPages.push([name, await txt(page, ".ds-page-head h1")]);
      await ss(page, `fr-${name}`);
    }
    const frExpected = ["Tableau de bord", "Colis", "Expéditeurs", "Livreurs"];
    const frSide = await sidebar(page);
    const frSideOk = ["Tableau de bord", "Livraisons", "Livreurs", "Expéditeurs", "Entrepôts", "Paramètres"]
      .every((w) => frSide.includes(w));
    frPages.every(([, h], i) => h === frExpected[i]) && frSideOk
      ? pass("b", `4 pages FR : ${frPages.map(([, h]) => h).join(" · ")} · sidebar FR OK`)
      : fail("b", `FR inattendu : ${JSON.stringify(frPages)} sidebar=${frSideOk} :: ${frSide.slice(0, 200)}`);

    // ============ c) DEUTSCH ============
    console.log("\n--- c) Bascule Deutsch ---");
    await switchLang(page, "de");
    const deSide = await sidebar(page);
    const deNav = ["Übersicht", "Zustellungen", "Zuweisung", "Ferndispatch", "Live-Verfolgung",
                   "Fahrer", "Versender", "Kunden", "Lager", "Finanzen", "Support", "Einstellungen"];
    const navMiss = deNav.filter((w) => !deSide.includes(w));
    navMiss.length === 0 ? pass("c1", `sidebar DE complete (${deNav.length} entrees + 4 groupes)`)
                         : fail("c1", "sidebar DE, manquants : " + navMiss.join(", "));
    await ss(page, "de-sidebar");

    // dashboard DE
    await goto(page, "/admin");
    const deDash = await body(page);
    const dashWords = ["Übersicht", "Sendungen insgesamt", "Heute zugestellt", "In Zustellung",
                       "Umsatz (Monat)", "Zustellungen pro Tag", "Letzte 7 Tage",
                       "Zustellungen nach Region", "Diesen Monat", "Aktuelle Aktivität",
                       "Alle ansehen", "Erfolgsquote", "Neue Sendung"];
    const dashMiss = dashWords.filter((w) => !deDash.includes(w));
    // jours du graphe + activité mock traduits
    const daysDE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].every((d) => deDash.includes(d));
    const actDE = deDash.includes("Neue Sendung erstellt") && /vor \d+ Min\./.test(deDash);
    dashMiss.length === 0 && daysDE && actDE
      ? pass("c2", "dashboard DE complet (KPI, graphes, jours Mo-So, activite 'vor N Min.')")
      : fail("c2", `dashboard DE : manquants=${dashMiss.join(",")} jours=${daysDE} activite=${actDE}`);
    await ss(page, "de-dashboard");

    // colis DE
    await goto(page, "/admin/shipments");
    const deShip = await body(page);
    const shipWords = ["Sendungen", "Ferndispatch", "Sendungsnr.", "Versender", "Empfänger",
                       "Art", "Preis", "Nachnahme", "Status", "Erstellt", "Alle Status"];
    const shipMiss = shipWords.filter((w) => !deShip.includes(w));
    const statusDE = /(Zugestellt|Ausstehend|Abzuholen|Abgeholt|Im Lager|Unterwegs|In Zustellung|Storniert)/.test(deShip);
    shipMiss.length === 0 && statusDE
      ? pass("c3", "colis DE : colonnes + Ferndispatch + statuts traduits")
      : fail("c3", `colis DE : manquants=${shipMiss.join(",")} statuts=${statusDE} :: ${deShip.slice(0, 200)}`);
    await ss(page, "de-colis");

    // expéditeurs DE
    await goto(page, "/admin/expediteurs");
    const deExp = await body(page);
    const expWords = ["Versender", "Neuer Versender", "Unternehmen", "E-Mail", "Telefon",
                      "Stadt", "Saldo", "Status", "Exportieren", "Alle Status"];
    const expMiss = expWords.filter((w) => !deExp.includes(w));
    expMiss.length === 0 ? pass("c4", "expediteurs DE : liste + colonnes + Neuer Versender")
                         : fail("c4", "expediteurs DE, manquants : " + expMiss.join(", "));
    await ss(page, "de-expediteurs");

    // livreurs DE + véhicules
    await goto(page, "/admin/drivers");
    const deLiv = await body(page);
    const livWords = ["Fahrer", "Fahrer hinzufügen", "Fahrzeug", "Personalausweis", "Zone",
                      "Zustellungen", "Bewertung", "Alle Status"];
    const livMiss = livWords.filter((w) => !deLiv.includes(w));
    const vehDE = /(Motorrad|Lieferwagen|Auto|LKW)/.test(deLiv);
    const livStatusDE = /(Verfügbar|Beschäftigt|Offline)/.test(deLiv);
    livMiss.length === 0 && vehDE
      ? pass("c5", `livreurs DE : colonnes + vehicules traduits (${(deLiv.match(/(Motorrad|Lieferwagen|Auto|LKW)/g) || []).join(", ")}) · statuts=${livStatusDE}`)
      : fail("c5", `livreurs DE : manquants=${livMiss.join(",")} vehicules=${vehDE} :: ${deLiv.slice(0, 200)}`);
    await ss(page, "de-livreurs");

    // ============ d) FORMULAIRES EN DE ============
    console.log("\n--- d) Formulaires d'ajout en allemand ---");
    await page.click(".ds-btn-primary");
    await page.waitForTimeout(700);
    const livForm = norm(await page.textContent(".modal"));
    const livFormWords = ["Neuer Fahrer", "Erstellt das Login-Konto", "Vorname", "Nachname",
                          "E-Mail", "Telefon", "Initiales Passwort", "Personalausweis (8 Ziffern)",
                          "Fahrzeugtyp", "Kennzeichen", "Abbrechen", "Fahrer erstellen"];
    const livFormMiss = livFormWords.filter((w) => !livForm.includes(w));
    const vehOptions = norm(await page.textContent(".modal select"));
    const vehOptOk = ["Motorrad", "Auto", "Lieferwagen", "LKW"].every((v) => vehOptions.includes(v));
    livFormMiss.length === 0 && vehOptOk
      ? pass("d1", `formulaire livreur DE complet · options vehicule = ${vehOptions}`)
      : fail("d1", `formulaire livreur DE : manquants=${livFormMiss.join(",")} options=${vehOptions}`);
    await ss(page, "de-form-livreur");
    await page.click(".modal-close");
    await page.waitForTimeout(400);

    await goto(page, "/admin/expediteurs");
    await page.click(".ds-btn-primary");
    await page.waitForTimeout(700);
    const expForm = norm(await page.textContent(".modal"));
    const expFormWords = ["Neuer Versender", "Erstellt das Login-Konto", "Name des Unternehmens",
                          "Kontakt", "E-Mail", "Telefon", "Initiales Passwort", "Stadt",
                          "Steuernummer", "Standard-Abholadresse", "Abbrechen", "Versender erstellen"];
    const expFormMiss = expFormWords.filter((w) => !expForm.includes(w));
    const pwdPh = await page.getAttribute('.modal input[type="password"]', "placeholder");
    expFormMiss.length === 0 && /Mindestens 8 Zeichen/.test(pwdPh || "")
      ? pass("d2", `formulaire expediteur DE complet · placeholder mdp = "${pwdPh}"`)
      : fail("d2", `formulaire expediteur DE : manquants=${expFormMiss.join(",")} placeholder=${pwdPh}`);
    await ss(page, "de-form-expediteur");
    await page.click(".modal-close");
    await page.waitForTimeout(400);

    // ============ e) TAGLINES DE LOGIN ============
    console.log("\n--- e) Taglines des 5 pages de login ---");
    const TAGLINES = {
      admin: { de: "Steuern Sie die gesamte Plattform von einem Ort aus.", fr: "Pilotez toute la plateforme depuis un seul endroit." },
      expediteur: { de: "Erstellen und verfolgen Sie Ihre Sendungen mühelos.", fr: "Créez et suivez vos colis en toute simplicité." },
      livreur: { de: "Verwalten Sie Ihre Aufträge und Zustellungen.", fr: "Gérez vos courses et vos livraisons." },
      dispatch: { de: "Kontrollieren Sie die Sendungen beim Lagerdurchlauf.", fr: "Contrôlez les colis à leur passage au dépôt." },
      finance: { de: "Steuern Sie Liquidität und Rechnungsstellung.", fr: "Pilotez la trésorerie et la facturation." },
    };
    const lp = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
    const lpg = await lp.newPage();
    lpg.on("console", (m) => { if (/missingKey|i18next::translator/i.test(m.text())) missingKeys.push(m.text()); });
    await lpg.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await lpg.evaluate(() => localStorage.setItem("i18nextLng", "de"));

    const tagResults = [];
    for (const role of Object.keys(TAGLINES)) {
      await lpg.goto(`${BASE}/${role}/login`, { waitUntil: "domcontentloaded" });
      await lpg.waitForTimeout(1200);
      const h2 = await txt(lpg, ".auth-brand-mid h2");
      const bullets = norm(await lpg.textContent(".auth-bullets"));
      const ok = h2 === TAGLINES[role].de && bullets.length > 20 && !/[àéèêç]/.test(bullets);
      tagResults.push(`${role}=${ok ? "OK" : `KO("${h2}")`}`);
      if (role === "admin" || role === "finance") await ss(lpg, `de-login-${role}`);
    }
    tagResults.every((r) => r.includes("=OK"))
      ? pass("e1", `5 taglines DE + puces traduites : ${tagResults.join(" ")}`)
      : fail("e1", "taglines DE : " + tagResults.join(" "));

    // bascule FR sur la page de login
    await lpg.goto(`${BASE}/finance/login`, { waitUntil: "domcontentloaded" });
    await lpg.waitForTimeout(1000);
    await switchLang(lpg, "fr");
    const frTag = await txt(lpg, ".auth-brand-mid h2");
    const frLogin = norm(await lpg.textContent(".auth-card"));
    frTag === TAGLINES.finance.fr && frLogin.includes("Retour au site") && frLogin.includes("Se souvenir de moi")
      ? pass("e2", `bascule FR sur le login : "${frTag}"`)
      : fail("e2", `bascule FR login : tagline="${frTag}"`);
    await ss(lpg, "fr-login-finance");
    await lp.close();

    // ============ f) REBASCULE FR (espace admin) ============
    console.log("\n--- f) Rebascule en francais ---");
    await switchLang(page, "fr");
    await goto(page, "/admin");
    const backFr = await body(page);
    const backSide = await sidebar(page);
    const frBackOk = backFr.includes("Tableau de bord") && backFr.includes("Colis au total")
      && backFr.includes("Livraisons par jour") && backSide.includes("Entrepôts")
      && /Il y a \d+ min/.test(backFr);
    frBackOk ? pass("f", "retour FR complet (dashboard, graphes, activite, sidebar)")
             : fail("f", `retour FR : ${backFr.slice(0, 220)}`);
    await ss(page, "fr-retour");

    // ============ h) 390px EN DE ============
    console.log("\n--- h) Responsive 390px en allemand ---");
    await switchLang(page, "de");
    await page.setViewportSize({ width: 390, height: 844 });
    const overflows = {};
    for (const [href, name] of [["/admin", "dashboard"], ["/admin/shipments", "colis"],
                                ["/admin/expediteurs", "expediteurs"], ["/admin/drivers", "livreurs"]]) {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1800);
      overflows[name] = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
      await ss(page, `de-390-${name}`);
    }
    const worst = Math.max(...Object.values(overflows));
    worst <= 0
      ? pass("h", `390px : aucun debordement horizontal (${JSON.stringify(overflows)})`)
      : fail("h", `390px debordements : ${JSON.stringify(overflows)}`);

    // ============ i) MISSINGKEY + FR RESIDUEL ============
    console.log("\n--- i) missingKey + texte FR residuel ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    const allFr = [];
    const allRaw = [];
    for (const href of ["/admin", "/admin/shipments", "/admin/expediteurs", "/admin/drivers"]) {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1900);
      const shell = norm(await page.textContent(".ds-shell").catch(() => ""));
      allFr.push(...frHits(shell).map((w) => `${href}:${w}`));
      allRaw.push(...rawKeys(shell).map((k) => `${href}:${k}`));
    }
    allFr.length === 0 ? pass("i1", "aucun texte FR residuel dans l'espace admin en DE (graphes + activite inclus)")
                       : fail("i1", "FR residuel : " + [...new Set(allFr)].join(" | "));
    allRaw.length === 0 ? pass("i2", "aucune cle i18n brute affichee")
                        : fail("i2", "cles brutes : " + [...new Set(allRaw)].join(" | "));
    missingKeys.length === 0 ? pass("i3", "aucun warning i18next missingKey")
                             : fail("i3", missingKeys.length + " missingKey : " + missingKeys.slice(0, 5).join(" | "));
    /*
     * Erreurs attendues, non applicatives :
     *  - 401 sur /auth/me au bootstrap (avant restauration de session) ;
     *  - 429 sur /auth/refresh : visiter les 5 pages de login déclenche autant
     *    de rafraîchissements, et le backend limite à 30 / 15 min / IP.
     */
    const realErrors = consoleErrors.filter((e) => !/favicon|manifest|404 \(Not Found\)/i.test(e));
    const onlyExpected = realErrors.every((e) => /401 \(Unauthorized\)|429 \(Too Many Requests\)/.test(e));
    realErrors.length === 0
      ? pass("i4", "aucune erreur console")
      : onlyExpected
      ? pass("i4", `aucune erreur applicative (${realErrors.length} attendues : 401 bootstrap / 429 limiteur auth)`)
      : fail("i4", realErrors.length + " erreurs : " + realErrors.slice(0, 4).join(" | "));
  } catch (err) {
    fail("FATAL", String(err.message).split(/\r?\n/)[0]);
    await ss(page, "fatal");
  }

  console.log("\n=============== RESUME ===============");
  const ok = RESULTS.filter((r) => r.ok).length;
  const ko = RESULTS.filter((r) => r.ok === false);
  console.log(`${ok}/${RESULTS.length} OK`);
  ko.forEach((r) => console.log(`  FAIL ${r.id}: ${r.d}`));
  await browser.close();
  process.exit(ko.length ? 1 : 0);
})();
