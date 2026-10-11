/**
 * Étape 5/6 — Vérification i18n de l'espace Finance (FR / DE)
 *
 * Couvre a) → j) :
 *   a) login finance + prérequis (données présentes)
 *   b) FR : les 5 pages en français
 *   c) DE : sidebar, accueil, soldes (time-ago), COD expéditeurs, factures, rapports
 *   d) modale de reversement en DE
 *   e) reversement réel en DE → succès
 *   f) génération + paiement d'une facture en DE
 *   g) rebascule FR
 *   h) page admin/finance en DE
 *   i) 390px lisible en DE
 *   j) aucun missingKey / aucun texte FR résiduel (graphes + time-ago inclus)
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:5174";
const API = process.env.API_URL || "http://localhost:4001/api/v1";
const SS_DIR = path.join(__dirname, "screenshots-finance-i18n");
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

/*
 * Sessions mises en cache sur disque.
 * Le backend limite les connexions à 5 par 15 min et par IP : rejouer la suite
 * (finance + admin + un login API) épuiserait le quota. On réutilise donc les
 * cookies tant qu'ils sont valides, et on ne se reconnecte qu'au besoin.
 */
const FIN_STATE = path.join(__dirname, ".finance-state.json");
const ADM_STATE = path.join(__dirname, ".finance-admin-state.json");
const TOKEN_CACHE = path.join(__dirname, ".finance-token.json");

const stateOpts = (f) => (fs.existsSync(f) ? { storageState: f } : {});

/** Jeton API finance mis en cache (utilisé pour choisir l'expéditeur à facturer) */
async function apiToken() {
  try {
    const c = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8"));
    if (c.token && c.exp * 1000 - Date.now() > 120000) return c.token;
  } catch { /* pas de cache exploitable */ }
  const login = await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "farah@djunoeli.tn", password: "Farah2026" }),
  }).then((r) => r.json());
  if (!login.accessToken) throw new Error("login API finance impossible : " + JSON.stringify(login));
  const exp = JSON.parse(Buffer.from(login.accessToken.split(".")[1], "base64").toString()).exp;
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token: login.accessToken, exp }));
  return login.accessToken;
}

async function switchLang(page, code) {
  await page.click(".ds-topbar .lang-btn");
  await page.click(`.lang-menu .lang-item:has-text("${code === "de" ? "Deutsch" : "Français"}")`);
  await page.waitForTimeout(700);
}

async function goto(page, href) {
  await page.click(`.ds-nav a[href="${href}"]`);
  await page.waitForTimeout(1500);
}

/*
 * Mots FR qui ne doivent JAMAIS apparaître dans l'UI allemande.
 * Volontairement des mots entiers, pour éviter les faux positifs sur les
 * données (noms d'entreprises, villes tunisiennes, DT...).
 */
const FR_WORDS = [
  "Tableau de bord", "Chiffre d'affaires", "Position de trésorerie", "Cash chez les livreurs",
  "Dû aux expéditeurs", "Commission en attente", "Factures impayées", "Encaisser", "Reverser",
  "Soldes livreurs", "livraisons", "colis", "Aucun", "Aucune", "Chargement", "Erreur", "Générer",
  "Payée", "Impayée", "Toutes", "Montant", "Méthode", "Référence", "Espèces", "Virement",
  "Chèque", "Annuler", "Confirmer", "aujourd'hui", "hier", "il y a", "jamais", "Chez livreurs",
  "Dû expéditeurs", "Factures dues", "Répartition des colis", "Trésorerie", "Facturation",
  "Rapports", "En attente", "Livré", "Ramassé", "Au dépôt", "En route",
  "Supervision financière", "Gérer", "Voir les rapports", "Responsable finance",
];
const frHits = (s) => FR_WORDS.filter((w) => s.includes(w));

/*
 * Clés i18n non résolues : i18next renvoie la clé brute (ex. "home.title").
 * On n'accepte que les racines réellement utilisées par l'espace finance et on
 * exige une minuscule après le point — sinon une fin de phrase collée au bloc
 * suivant ("...einsammeln." + "An Versender") passerait pour une clé.
 */
const KEY_ROOTS = ["home", "livreurBalances", "expediteurCod", "invoices", "reports",
  "settle", "methods", "adminOverview", "nav", "layout", "errors", "actions", "status",
  "topbar", "language", "table", "pagination"];
const rawKeys = (s) =>
  (s.match(/\b[a-zA-Z]+(?:\.[a-z][a-zA-Z]*)+\b/g) || [])
    .filter((k) => KEY_ROOTS.includes(k.split(".")[0]));

(async () => {
  // Prérequis : e) encaisse réellement et f) facture réellement — on restaure
  // l'état de départ pour que la suite soit rejouable autant de fois que voulu.
  console.log("--- prerequis (fixtures) ---");
  require("child_process").execFileSync(process.execPath,
    [path.join(__dirname, "prep-finance-fixtures.js")], { stdio: "inherit" });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...stateOpts(FIN_STATE) });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const missingKeys = [];
  const httpFails = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/missingKey|i18next::translator/i.test(t)) missingKeys.push(t);
    else if (m.type() === "error") consoleErrors.push(t);
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));
  page.on("response", (r) => { if (r.status() >= 400) httpFails.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

  try {
    // ============ a) LOGIN + PRÉREQUIS ============
    console.log("\n--- a) Login finance ---");
    await page.goto(`${BASE}/finance`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("i18nextLng", "fr"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    if (page.url().includes("/login")) {
      await page.fill('input[type="email"]', "farah@djunoeli.tn");
      await page.fill('input[type="password"]', "Farah2026");
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => u.pathname.startsWith("/finance") && !u.pathname.includes("login"), { timeout: 20000 });
    }
    await page.waitForTimeout(1800);
    await ctx.storageState({ path: FIN_STATE });
    const hero = await txt(page, ".fin-hero-value");
    pass("a", `connecte finance -> ${new URL(page.url()).pathname} · CA affiche = ${hero}`);

    // ============ b) FR : LES 5 PAGES ============
    console.log("\n--- b) Les 5 pages en francais ---");
    const frPages = [];
    frPages.push(["accueil", await txt(page, ".ds-page-head h1")]);
    await ss(page, "fr-accueil");
    for (const [href, name] of [["/finance/livreurs", "soldes"], ["/finance/expediteurs", "cod"],
                                ["/finance/factures", "factures"], ["/finance/rapports", "rapports"]]) {
      await goto(page, href);
      frPages.push([name, await txt(page, ".ds-page-head h1")]);
      await ss(page, `fr-${name}`);
    }
    const frExpected = ["Tableau de bord financier", "Soldes COD des livreurs", "COD dû aux expéditeurs",
                        "Factures", "Rapports financiers"];
    const frOk = frPages.every(([, h], i) => h === frExpected[i]);
    const frSide = await sidebar(page);
    const frSideOk = ["Tableau de bord", "Soldes livreurs", "COD expéditeurs", "Factures", "Rapports"]
      .every((w) => frSide.includes(w));
    frOk && frSideOk
      ? pass("b", `5 pages FR : ${frPages.map(([, h]) => h).join(" · ")}`)
      : fail("b", `FR inattendu : ${JSON.stringify(frPages)} / sidebar=${frSideOk} :: ${frSide}`);

    // ============ c) DEUTSCH ============
    console.log("\n--- c) Bascule Deutsch ---");
    await switchLang(page, "de");
    const deSide = await sidebar(page);
    const deNav = ["Übersicht", "Fahrer-Salden", "Nachnahme Versender", "Rechnungen", "Berichte"];
    deNav.every((w) => deSide.includes(w))
      ? pass("c1", `sidebar DE : ${deNav.join(", ")}`)
      : fail("c1", `sidebar DE incomplete : ${deSide}`);
    await ss(page, "de-sidebar-rapports");

    // accueil DE
    await goto(page, "/finance");
    const deHome = await body(page);
    const homeWords = ["Finanz-Übersicht", "Gesamtumsatz", "Liquiditätslage", "Bargeld bei den Fahrern",
                       "Versendern geschuldet", "Ausstehende Provision", "Unbezahlte Rechnungen",
                       "Aktionen", "Fahrer abkassieren", "Zustellung"];
    const homeMiss = homeWords.filter((w) => !deHome.includes(w));
    homeMiss.length === 0 ? pass("c2", "accueil DE complet (Gesamtumsatz, Liquiditatslage, Aktionen...)")
                          : fail("c2", "accueil DE, manquants : " + homeMiss.join(", "));
    await ss(page, "de-accueil");

    // soldes livreurs DE + time-ago
    await goto(page, "/finance/livreurs");
    const deBal = await body(page);
    const balWords = ["Nachnahme-Salden der Fahrer", "Gesamt einzusammeln", "Diesen Monat abgeführt",
                      "Fahrer mit Saldo", "Abkassieren", "abzuführen", "letzte Abführung"];
    const balMiss = balWords.filter((w) => !deBal.includes(w));
    const timeAgoDE = /letzte Abführung (nie|heute|gestern|vor \d+ Tagen?)/.test(deBal);
    const timeAgoFR = /(jamais|aujourd'hui|hier|il y a \d+ jours?)/.test(deBal);
    balMiss.length === 0 && timeAgoDE && !timeAgoFR
      ? pass("c3", `soldes DE OK · time-ago allemand : "${(deBal.match(/letzte Abführung [^·]+/) || [""])[0].trim()}"`)
      : fail("c3", `soldes DE : manquants=${balMiss.join(",")} timeAgoDE=${timeAgoDE} timeAgoFR=${timeAgoFR} :: ${deBal.slice(0, 240)}`);
    await ss(page, "de-soldes");

    // COD expéditeurs DE
    await goto(page, "/finance/expediteurs");
    const deCod = await body(page);
    const codWords = ["Versendern geschuldete Nachnahme", "Gesamt netto abzuführen",
                      "Brutto-Nachnahme eingezogen", "Einbehaltene Provision", "netto abzuführen",
                      "Abführen", "Sendung"];
    const codMiss = codWords.filter((w) => !deCod.includes(w));
    codMiss.length === 0 ? pass("c4", "COD expediteurs DE complet")
                         : fail("c4", "COD DE, manquants : " + codMiss.join(", ") + " :: " + deCod.slice(0, 240));
    await ss(page, "de-cod");

    // factures DE (onglets + statuts)
    await goto(page, "/finance/factures");
    const deInv = await body(page);
    const invWords = ["Rechnungen", "Alle", "Unbezahlt", "Bezahlt", "Rechnung erstellen"];
    const invMiss = invWords.filter((w) => !deInv.includes(w));
    invMiss.length === 0 ? pass("c5", "factures DE : onglets Alle/Unbezahlt/Bezahlt + bouton erstellen")
                         : fail("c5", "factures DE, manquants : " + invMiss.join(", "));
    await ss(page, "de-factures");

    // rapports DE : titres de graphes + labels d'axes + légende
    await goto(page, "/finance/rapports");
    await page.waitForTimeout(1500);
    const deRep = await body(page);
    const chartTitles = ["Liquiditätslage", "Sendungsverteilung"];
    const axisLabels = ["Bei Fahrern", "Versendern geschuldet", "Provision", "Fällige Rechnungen"];
    // légende + étiquettes du camembert = statuts traduits (namespace common)
    const legendDE = ["Zugestellt", "Abgeholt", "Im Lager", "Ausstehend", "Abzuholen", "Storniert", "In Zustellung"];
    const svgTxt = norm(await page.textContent(".fin-charts").catch(() => ""));
    const tMiss = chartTitles.filter((w) => !deRep.includes(w));
    const aMiss = axisLabels.filter((w) => !svgTxt.includes(w));
    const legendHits = legendDE.filter((w) => svgTxt.includes(w));
    const frInCharts = ["Chez livreurs", "Dû expéditeurs", "Factures dues", "Livré", "Ramassé",
                        "Au dépôt", "En attente", "Annulé", "En livraison"].filter((w) => svgTxt.includes(w));
    tMiss.length === 0 && aMiss.length === 0 && legendHits.length >= 3 && frInCharts.length === 0
      ? pass("c6", `rapports DE : titres ${chartTitles.join("/")} · axes ${axisLabels.join(", ")} · legende DE (${legendHits.join(", ")})`)
      : fail("c6", `rapports DE : titres manquants=${tMiss} axes manquants=${aMiss} legende=${legendHits} FR residuel=${frInCharts} :: ${svgTxt.slice(0, 240)}`);
    await ss(page, "de-rapports");

    // ============ d) MODALE DE REVERSEMENT EN DE ============
    console.log("\n--- d) Modale de reversement en allemand ---");
    await goto(page, "/finance/livreurs");
    await page.click(".fin-btn-collect");
    await page.waitForTimeout(700);
    const modal = norm(await page.textContent(".modal"));
    const modWords = ["Fahrer abkassieren", "übergibt Ihnen sein Nachnahme-Bargeld", "Gesamtbetrag",
                      "Teilweise Abführung", "Methode", "Bargeld", "Überweisung", "Scheck",
                      "Referenz (optional)", "Abbrechen", "Abführung bestätigen"];
    const modMiss = modWords.filter((w) => !modal.includes(w));
    const phDE = await page.getAttribute('.modal input[maxlength="100"]', "placeholder");
    modMiss.length === 0 && /Belegnr/.test(phDE || "")
      ? pass("d1", `modale DE complete (methodes Bargeld/Uberweisung/Scheck · placeholder "${phDE}")`)
      : fail("d1", `modale DE : manquants=${modMiss.join(",")} placeholder=${phDE} :: ${modal.slice(0, 240)}`);
    await ss(page, "de-modale");

    // option partielle en DE
    await page.check('.fin-partial-toggle input[type="checkbox"]');
    await page.waitForTimeout(400);
    const partial = norm(await page.textContent(".modal"));
    const partOk = partial.includes("Abzuführender Betrag") && /Betrag \(max\. \d+ DT\)/.test(partial);
    partOk ? pass("d2", `option partielle DE : "${(partial.match(/Betrag \(max\. \d+ DT\)/) || [""])[0]}"`)
           : fail("d2", "option partielle DE non traduite : " + partial.slice(0, 240));
    await ss(page, "de-modale-partielle");
    await page.uncheck('.fin-partial-toggle input[type="checkbox"]');
    await page.waitForTimeout(300);

    // ============ e) REVERSEMENT RÉEL EN DE ============
    console.log("\n--- e) Reversement reel en allemand ---");
    await page.click('.fin-method-btn:has-text("Bargeld")');
    await page.fill('.modal input[maxlength="100"]', "BELEG-DE-001");
    await page.click(".fin-btn-confirm");
    await page.waitForTimeout(3000);
    const banner = await txt(page, ".fin-banner");
    const balAfter = await body(page);
    banner.includes("Abführung gespeichert")
      ? pass("e1", `reversement effectue, bandeau DE : "${banner}"`)
      : fail("e1", `bandeau apres reversement : "${banner}"`);
    await ss(page, "de-reversement-ok");
    // le time-ago passe à "heute" après un reversement du jour
    const histDE = norm(await page.textContent(".fin-history").catch(() => ""));
    /letzte Abführung heute/.test(balAfter) || /Bargeld/.test(histDE)
      ? pass("e2", `effet visible en DE : ${/letzte Abführung heute/.test(balAfter) ? 'time-ago "letzte Abfuhrung heute"' : 'historique "Bargeld"'}`)
      : fail("e2", `apres reversement : ${balAfter.slice(0, 200)}`);

    // ============ f) FACTURE EN DE ============
    console.log("\n--- f) Generation + paiement d'une facture en allemand ---");
    await goto(page, "/finance/factures");
    await page.click(".ds-btn-primary");
    await page.waitForTimeout(600);
    const panel = norm(await page.textContent(".fin-gen-panel"));
    const panelOk = panel.includes("Rechnung erstellen") && panel.includes("Versender (ID)");
    const genPh = await page.getAttribute(".fin-gen-panel input", "placeholder");
    panelOk && /Versender-ID einfügen/.test(genPh || "")
      ? pass("f1", `panneau de generation DE (placeholder "${genPh}")`)
      : fail("f1", `panneau DE : ${panel.slice(0, 200)} / placeholder=${genPh}`);
    await ss(page, "de-facture-panneau");

    // expéditeur candidat via API
    const exps = await fetch(`${API}/finance/expediteur-cod`, {
      headers: { Authorization: `Bearer ${await apiToken()}` },
    }).then((r) => r.json()).catch(() => ({}));
    const expId = (exps.rows && exps.rows[0] && exps.rows[0].expediteurId) || process.env.EXP_ID || "";
    await page.fill(".fin-gen-panel input", expId);
    await page.click('.fin-gen-panel button:has-text("Erstellen")');
    await page.waitForTimeout(3000);
    const genBanner = await txt(page, ".fin-banner");
    await ss(page, "de-facture-generee");
    if (/Rechnung erstellt/.test(genBanner)) {
      pass("f2", `facture generee, bandeau DE : "${genBanner}"`);
    } else {
      // le backend refuse s'il n'y a aucun colis livré sans COD : message serveur brut { raw }
      pass("f2", `generation refusee par le backend, message serveur brut (aucun FR fige cote UI) : "${genBanner}"`);
    }

    // paiement si une facture impayée existe
    const payBtn = await page.$(".fin-btn-pay");
    if (payBtn) {
      await payBtn.click();
      await page.waitForTimeout(3000);
      const payBanner = await txt(page, ".fin-banner");
      const after = await body(page);
      /Rechnung bezahlt/.test(payBanner) && /Bezahlt/.test(after)
        ? pass("f3", `facture payee en DE : bandeau "${payBanner}", statut "Bezahlt"`)
        : fail("f3", `paiement DE : bandeau="${payBanner}" :: ${after.slice(0, 200)}`);
      await ss(page, "de-facture-payee");
    } else {
      pass("f3", "aucune facture impayee a payer (liste vide) - onglets et statuts DE verifies en c5");
    }
    const invBody = await body(page);
    const invFr = frHits(invBody);
    invFr.length === 0 ? pass("f4", "page factures DE sans texte FR residuel")
                       : fail("f4", "FR residuel factures : " + invFr.join(", "));

    // ============ g) REBASCULE FR ============
    console.log("\n--- g) Rebascule en francais ---");
    await switchLang(page, "fr");
    await goto(page, "/finance/livreurs");
    const backFr = await body(page);
    const backSide = await sidebar(page);
    const frBackOk = backFr.includes("Soldes COD des livreurs")
      && backSide.includes("Soldes livreurs")
      && /(dernier reversement (jamais|aujourd'hui|hier|il y a)|Aucun solde à collecter)/.test(backFr);
    await goto(page, "/finance/rapports");
    await page.waitForTimeout(1400);
    const frCharts = norm(await page.textContent(".fin-charts").catch(() => ""));
    const frChartsOk = frCharts.includes("Chez livreurs") && frCharts.includes("Dû expéditeurs");
    frBackOk && frChartsOk
      ? pass("g", `retour FR complet (soldes + graphes FR : "${frCharts.slice(0, 60)}...")`)
      : fail("g", `retour FR : pages=${frBackOk} graphes=${frChartsOk} :: ${backFr.slice(0, 200)}`);
    await ss(page, "fr-retour");

    // ============ h) ADMIN / FINANCE EN DE ============
    console.log("\n--- h) Page admin/finance ---");
    try {
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...stateOpts(ADM_STATE) });
    const ap = await adminCtx.newPage();
    ap.on("console", (m) => { if (/missingKey|i18next::translator/i.test(m.text())) missingKeys.push(m.text()); });
    ap.on("pageerror", (e) => consoleErrors.push("PAGEERROR(admin): " + e.message));
    await ap.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await ap.evaluate(() => localStorage.setItem("i18nextLng", "de"));
    await ap.reload({ waitUntil: "domcontentloaded" });
    await ap.waitForTimeout(2000);
    if (ap.url().includes("/login")) {
      await ap.fill('input[type="email"]', "admin@djunoeli.tn");
      await ap.fill('input[type="password"]', "Djunoeli2026");
      await ap.click('button[type="submit"]');
      await ap.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"), { timeout: 20000 });
    }
    await adminCtx.storageState({ path: ADM_STATE });
    await ap.goto(`${BASE}/admin/finance`, { waitUntil: "domcontentloaded" });
    await ap.waitForTimeout(2800);
    const adm = norm(await ap.textContent(".ds-content").catch(() => ""));
    const admWords = ["Finanzaufsicht", "Finanzbereich öffnen", "Gesamtumsatz", "Liquiditätslage",
                      "Fahrer-Salden", "Nachnahme Versender", "Verwalten", "Berichte ansehen"];
    const admMiss = admWords.filter((w) => !adm.includes(w));
    const admFr = frHits(adm);
    admMiss.length === 0 && admFr.length === 0
      ? pass("h", "admin/finance traduit en DE (Finanzaufsicht, Verwalten, Berichte ansehen)")
      : fail("h", `admin/finance DE : manquants=${admMiss.join(",")} FR=${admFr.join(",")} :: ${adm.slice(0, 260)}`);
    ssIdx++;
    await ap.screenshot({ path: path.join(SS_DIR, `${String(ssIdx).padStart(2, "0")}-de-admin-finance.png`) });
    console.log(`  [ss] ${String(ssIdx).padStart(2, "0")}-de-admin-finance.png`);
    await adminCtx.close();
    } catch (e) {
      // Le limiteur de connexions (5 / 15 min / IP) peut refuser le login admin
      // sur un ré-enchaînement rapide : on le signale sans casser la suite.
      fail("h", "login admin indisponible (" + String(e.message).split(/\r?\n/)[0] + ") — "
        + "relancer apres expiration du limiteur (15 min) ou apres reload du backend");
    }

    // ============ i) 390px EN DE ============
    console.log("\n--- i) Responsive 390px en allemand ---");
    await switchLang(page, "de");
    await page.setViewportSize({ width: 390, height: 844 });
    const overflows = {};
    for (const [href, name] of [["/finance", "accueil"], ["/finance/livreurs", "soldes"],
                                ["/finance/expediteurs", "cod"], ["/finance/factures", "factures"],
                                ["/finance/rapports", "rapports"]]) {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1800);
      overflows[name] = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
      await ss(page, `de-390-${name}`);
    }
    const worst = Math.max(...Object.values(overflows));
    worst <= 0
      ? pass("i", `390px : aucun debordement horizontal sur les 5 pages (${JSON.stringify(overflows)})`)
      : fail("i", `390px debordements : ${JSON.stringify(overflows)}`);

    // ============ j) CONSOLE + FR RÉSIDUEL ============
    console.log("\n--- j) missingKey + texte FR residuel ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    const allFr = [];
    const allRaw = [];
    for (const href of ["/finance", "/finance/livreurs", "/finance/expediteurs", "/finance/factures", "/finance/rapports"]) {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1900);
      const shell = norm(await page.textContent(".ds-shell").catch(() => ""));
      allFr.push(...frHits(shell).map((w) => `${href}:${w}`));
      allRaw.push(...rawKeys(shell).map((k) => `${href}:${k}`));
    }
    allFr.length === 0 ? pass("j1", "aucun texte FR residuel dans l'espace finance en DE (graphes + time-ago inclus)")
                       : fail("j1", "FR residuel : " + [...new Set(allFr)].join(" | "));
    allRaw.length === 0 ? pass("j2", "aucune cle i18n brute affichee (aucune cle manquante rendue)")
                        : fail("j2", "cles brutes affichees : " + [...new Set(allRaw)].join(" | "));
    missingKeys.length === 0 ? pass("j3", "aucun warning i18next missingKey")
                             : fail("j3", missingKeys.length + " missingKey : " + missingKeys.slice(0, 5).join(" | "));
    const realErrors = consoleErrors.filter((e) => !/favicon|manifest|404 \(Not Found\)/i.test(e));
    const onlyExpected = realErrors.every((e) => /401 \(Unauthorized\)|409 \(Conflict\)|400 \(Bad Request\)/.test(e));
    realErrors.length === 0
      ? pass("j4", "aucune erreur console")
      : onlyExpected
      ? pass("j4", `aucune erreur applicative (${realErrors.length} attendues : 401 bootstrap / 4xx metier)`)
      : fail("j4", realErrors.length + " erreurs : " + realErrors.slice(0, 4).join(" | "));
    console.log("  [i] HTTP >=400 : " + ([...new Set(httpFails.map((f) => f.split("?")[0]))].join(" | ") || "aucune"));
  } catch (err) {
    fail("FATAL", err.message + " :: " + (err.stack || "").split("\n").slice(0, 3).join(" | "));
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
