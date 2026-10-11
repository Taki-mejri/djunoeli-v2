/**
 * Étape 2/6 — Vérification i18n de l'espace Expéditeur (FR / DE)
 *
 * Couvre les tests a) → g) de la spec :
 *   a) login expéditeur          b) espace en FR
 *   c) bascule DE (statuts traduits, gouvernorats NON traduits)
 *   d) création d'un colis en allemand
 *   e) message d'erreur re-traduit au changement de langue
 *   f) sélecteur mobile 390px : code langue masqué
 *   g) aucun warning missingKey / aucune erreur console
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// 5173 : seule origine autorisée par le CORS du backend (server/.env CLIENT_ORIGIN)
const BASE = process.env.BASE_URL || "http://localhost:5173";
const SS_DIR = path.join(__dirname, "screenshots-expediteur-i18n");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const f = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, f), fullPage: false });
  console.log(`  📸 ${f}`);
};

const RESULTS = [];
const pass = (id, d) => { RESULTS.push({ id, ok: true, d }); console.log(`  ✅ ${id}: ${d}`); };
const fail = (id, d) => { RESULTS.push({ id, ok: false, d }); console.log(`  ❌ ${id}: ${d}`); };

/** Bascule la langue via le sélecteur du topbar */
async function switchLang(page, code) {
  await page.click(".lang-btn");
  await page.click(`.lang-menu .lang-item:has-text("${code === "de" ? "Deutsch" : "Français"}")`);
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const missingKeys = [];
  page.on("console", (msg) => {
    const txt = msg.text();
    if (/missingKey|i18next::translator/i.test(txt)) missingKeys.push(txt);
    else if (msg.type() === "error") consoleErrors.push(txt);
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  // Trace des réponses HTTP en échec, pour distinguer un vrai bug d'un 401 de bootstrap
  const httpFails = [];
  page.on("response", (r) => {
    if (r.status() >= 400) httpFails.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });

  try {
    // ============ a) LOGIN EXPÉDITEUR ============
    console.log("\n─── a) Login expéditeur ───");
    await page.goto(`${BASE}/expediteur/login`, { waitUntil: "domcontentloaded" });
    // Langue de départ : FR
    await page.evaluate(() => localStorage.setItem("i18nextLng", "fr"));
    await page.reload({ waitUntil: "domcontentloaded" });

    await page.fill('input[type="email"]', "medina@test.tn");
    await page.fill('input[type="password"]', "Medina2026");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith("/expediteur") && !u.pathname.includes("login"), { timeout: 20000 });
    await page.waitForTimeout(1500);
    await ss(page, "dashboard-fr");
    pass("a", "connecté en tant qu'expéditeur → " + new URL(page.url()).pathname);

    // ============ b) ESPACE EN FRANÇAIS ============
    console.log("\n─── b) Espace en français ───");
    let body = await page.textContent("body");
    const frExpected = ["Bonjour", "Colis ce mois", "Mes envois cette semaine", "Solde COD", "Mes livraisons", "Créer un envoi"];
    const frMissing = frExpected.filter((s) => !body.includes(s));
    frMissing.length === 0
      ? pass("b", "dashboard FR OK (" + frExpected.length + " libellés trouvés)")
      : fail("b", "libellés FR manquants : " + frMissing.join(", "));

    // Liste "Mes colis" en FR
    await page.click('.ds-nav a[href="/expediteur/shipments"]');
    await page.waitForTimeout(1800);
    body = await page.textContent("body");
    body.includes("Mes colis") ? pass("b2", 'liste = "Mes colis"') : fail("b2", "titre liste FR introuvable");
    await ss(page, "liste-fr");

    // ============ c) BASCULE EN ALLEMAND ============
    console.log("\n─── c) Bascule Deutsch ───");
    await switchLang(page, "de");
    await page.waitForTimeout(800);
    body = await page.textContent("body");

    const deExpected = ["Meine Sendungen", "Sendung erstellen", "Empfänger", "Sendungsnr.", "Alle Status"];
    const deMissing = deExpected.filter((s) => !body.includes(s));
    deMissing.length === 0
      ? pass("c1", "liste en allemand OK : " + deExpected.join(" · "))
      : fail("c1", "libellés DE manquants : " + deMissing.join(", "));

    // Aucun libellé FR résiduel dans la liste
    const frLeftovers = ["Mes colis", "Destinataire", "N° suivi", "Tous les statuts", "Créer un colis"].filter((s) => body.includes(s));
    frLeftovers.length === 0
      ? pass("c2", "aucun texte FR résiduel dans la liste")
      : fail("c2", "texte FR resté en dur : " + frLeftovers.join(", "));

    // Navigation traduite
    const navTxt = await page.textContent(".ds-nav");
    ["Übersicht", "Sendung erstellen", "Meine Sendungen", "Rechnungen", "Nachnahme-Saldo", "Mein Profil"].every((s) => navTxt.includes(s))
      ? pass("c3", "sidebar traduite en allemand")
      : fail("c3", "sidebar DE incomplète : " + navTxt.replace(/\s+/g, " "));

    // Statuts traduits (badges de la table)
    const badges = await page.$$eval(".dtable tbody .status-badge, .dtable tbody [class*='badge']", (els) => els.map((e) => e.textContent.trim()));
    const deStatuses = ["Ausstehend", "Abzuholen", "Abgeholt", "Im Lager", "Unterwegs", "In Zustellung", "Zugestellt", "Fehlgeschlagen", "Zurückgesendet", "Storniert"];
    const frStatuses = ["En attente", "À ramasser", "Ramassé", "Au dépôt", "En route", "En livraison", "Livré", "Échec", "Retourné", "Annulé"];
    const badStatus = badges.filter((b) => frStatuses.includes(b));
    if (badges.length === 0) fail("c4", "aucun badge de statut trouvé dans la table");
    else if (badStatus.length) fail("c4", "statuts encore en FR : " + badStatus.join(", "));
    else pass("c4", `statuts traduits (${badges.length} badges) : ${[...new Set(badges)].join(", ")}`);

    // Gouvernorats NON traduits
    const cities = await page.$$eval(".dtable tbody tr td:nth-child(3)", (els) => els.map((e) => e.textContent.trim()));
    const GOV = ["Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef",
      "Siliana", "Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
      "Tataouine", "Gafsa", "Tozeur", "Kébili"];
    const badCity = cities.filter((c) => c && !GOV.includes(c));
    badCity.length === 0
      ? pass("c5", `gouvernorats non traduits (${[...new Set(cities)].join(", ")})`)
      : fail("c5", "villes altérées : " + badCity.join(", "));
    await ss(page, "liste-de");

    // Dashboard en DE
    await page.click('.ds-nav a[href="/expediteur"]');
    await page.waitForTimeout(1500);
    body = await page.textContent("body");
    ["Guten Tag", "Sendungen diesen Monat", "Meine Sendungen diese Woche", "Nachnahme-Saldo"].every((s) => body.includes(s))
      ? pass("c6", "dashboard traduit en allemand")
      : fail("c6", "dashboard DE incomplet");
    // Jours du graphe en DE
    // Recharts v3 : on lit tous les libellés texte du SVG et on garde les jours
    const svgTexts = await page.$$eval(".recharts-wrapper svg text", (els) => els.map((e) => e.textContent.trim()));
    const ALL_DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const ticks = svgTexts.filter((s) => ALL_DAYS.includes(s));
    const deDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    ticks.length === 7 && deDays.every((d) => ticks.includes(d))
      ? pass("c7", "axe du graphe en allemand : " + ticks.join(" "))
      : fail("c7", "jours du graphe non traduits : [" + ticks.join(" ") + "]");
    await ss(page, "dashboard-de");

    // ============ d) CRÉATION D'UN COLIS EN ALLEMAND ============
    console.log("\n─── d) Création d'un colis en allemand ───");
    await page.click('.ds-nav a[href="/expediteur/new"]');
    await page.waitForTimeout(1200);
    body = await page.textContent("body");
    const createDE = ["Sendung erstellen", "Empfänger", "Lieferadresse", "Versandart", "Nachnahme", "Zusammenfassung", "Grundpreis"];
    const createMissing = createDE.filter((s) => !body.includes(s));
    createMissing.length === 0
      ? pass("d1", "formulaire de création en allemand")
      : fail("d1", "libellés DE manquants : " + createMissing.join(", "));

    // Le select des villes reste en tunisien
    const opts = await page.$$eval('select option', (els) => els.map((e) => e.textContent.trim()));
    opts.includes("Tunis") && opts.includes("Sfax") && opts.includes("Stadt auswählen...")
      ? pass("d2", "select villes : placeholder DE + gouvernorats non traduits")
      : fail("d2", "select villes inattendu : " + opts.slice(0, 6).join(" | "));

    // === e) Erreur re-traduite : on déclenche une erreur de validation en DE ===
    console.log("\n─── e) Erreur re-traduite au changement de langue ───");
    await page.fill('input[placeholder="Ahmed Karoui"]', "A"); // < 2 caractères → erreur
    await page.waitForTimeout(300);
    const errDE = await page.textContent(".auth-err").catch(() => "");
    errDE.includes("Name erforderlich")
      ? pass("e1", 'erreur de validation en DE : "' + errDE + '"')
      : fail("e1", "erreur DE inattendue : " + errDE);

    await switchLang(page, "fr");
    await page.waitForTimeout(400);
    const errFR = await page.textContent(".auth-err").catch(() => "");
    errFR.includes("Nom requis")
      ? pass("e2", 'la MÊME erreur repasse en FR : "' + errFR + '" (re-traduite, non figée)')
      : fail("e2", "erreur non re-traduite en FR : " + errFR);
    await ss(page, "erreur-retraduite-fr");

    // On repasse en allemand pour créer réellement le colis
    await switchLang(page, "de");
    await page.waitForTimeout(400);

    await page.fill('input[placeholder="Ahmed Karoui"]', "Klaus Müller");
    await page.fill('input[placeholder="+216 22 100 200"]', "+216 22 555 777");
    await page.fill('input[placeholder="12 Rue de Carthage, Immeuble Salem, Apt 3B"]', "45 Avenue Habib Bourguiba, Apt 7");
    await page.selectOption(".ship-section select", "Sousse");
    await page.check(".ship-fragile input[type=checkbox]");
    await page.waitForTimeout(600);

    // Prix live affiché ?
    const total = await page.textContent(".ship-sum-total");
    /\d+\s*DT/.test(total)
      ? pass("d3", "prix live affiché : " + total.replace(/\s+/g, " ").trim())
      : fail("d3", "prix live absent : " + total);
    await ss(page, "creation-de");

    await page.click(".ship-submit");
    await page.waitForURL(/\/expediteur\/shipments\/[^/]+$/, { timeout: 20000 });
    await page.waitForTimeout(1800);
    body = await page.textContent("body");
    const detailDE = ["Zustellung", "Abholung", "Empfänger", "Inhalt", "Termine", "Detailliertes Protokoll", "Sendung stornieren"];
    const detailMissing = detailDE.filter((s) => !body.includes(s));
    detailMissing.length === 0
      ? pass("d4", "colis créé en allemand + page détail traduite")
      : fail("d4", "détail DE incomplet, manquant : " + detailMissing.join(", "));

    // Timeline traduite + gouvernorat intact
    const tl = await page.textContent(".progress-timeline");
    ["Erstellt", "Abgeholt", "Im Lager", "Unterwegs", "In Zustellung", "Zugestellt"].every((s) => tl.includes(s))
      ? pass("d5", "timeline traduite en allemand")
      : fail("d5", "timeline DE incomplète : " + tl.replace(/\s+/g, " ").slice(0, 200));
    body.includes("Sousse") ? pass("d6", 'gouvernorat "Sousse" intact sur le détail') : fail("d6", "Sousse absent du détail");

    // Journal : la note système du backend ("Colis créé") doit être traduite
    const journal = await page.textContent(".ship-detail-timeline");
    journal.includes("Sendung erstellt") && !journal.includes("Colis créé")
      ? pass("d8", 'note système du journal traduite ("Colis créé" → "Sendung erstellt")')
      : fail("d8", "journal non traduit : " + journal.replace(/\s+/g, " ").slice(0, 160));
    await ss(page, "detail-de");

    // Modale d'annulation en DE
    await page.click('button:has-text("Sendung stornieren")');
    await page.waitForTimeout(600);
    const modal = await page.textContent(".modal");
    ["Sendung stornieren?", "Grund (optional)", "Sendung behalten", "Stornierung bestätigen"].every((s) => modal.includes(s))
      ? pass("d7", "modale d'annulation traduite en allemand")
      : fail("d7", "modale DE incomplète : " + modal.replace(/\s+/g, " ").slice(0, 200));
    await ss(page, "modale-annulation-de");
    await page.click('button:has-text("Sendung behalten")');
    await page.waitForTimeout(400);

    // Retour en FR : le détail doit repasser en français
    await switchLang(page, "fr");
    await page.waitForTimeout(700);
    body = await page.textContent("body");
    ["Livraison", "Ramassage", "Destinataire", "Contenu", "Dates", "Journal détaillé", "Annuler le colis"].every((s) => body.includes(s))
      ? pass("e3", "retour en FR : page détail entièrement en français")
      : fail("e3", "retour FR incomplet");
    await ss(page, "detail-fr");

    // ============ f) SÉLECTEUR MOBILE 390px ============
    console.log("\n─── f) Sélecteur de langue en mobile (390px) ───");
    const mob = await ctx.newPage();
    await mob.setViewportSize({ width: 390, height: 844 });
    await mob.goto(`${BASE}/expediteur`, { waitUntil: "domcontentloaded" });
    await mob.waitForTimeout(2500);
    const codeVisible = await mob.isVisible(".lang-btn .lang-code");
    const flagVisible = await mob.isVisible(".lang-btn .lang-flag");
    !codeVisible && flagVisible
      ? pass("f", "390px : code langue masqué, drapeau visible")
      : fail("f", `390px : code visible=${codeVisible}, drapeau visible=${flagVisible}`);
    await mob.screenshot({ path: path.join(SS_DIR, "99-mobile-390.png") });
    console.log("  📸 99-mobile-390.png");
    await mob.close();

    // ============ g) CONSOLE / missingKey ============
    console.log("\n─── g) Console ───");
    missingKeys.length === 0
      ? pass("g1", "aucun warning i18next missingKey")
      : fail("g1", missingKeys.length + " missingKey : " + missingKeys.slice(0, 5).join(" | "));
    console.log("  ℹ️  réponses HTTP >=400 : " + (httpFails.join(" | ") || "aucune"));
    // Les 401 sur /auth/refresh et /auth/me avant login sont le comportement normal
    // du bootstrap (aucune session) : ce ne sont pas des erreurs applicatives.
    const bootstrap401 = httpFails.length > 0 && httpFails.every((f) => /^401 (GET|POST) .*\/auth\/(me|refresh)$/.test(f));
    const realErrors = consoleErrors.filter((e) => !/favicon|manifest|404 \(Not Found\)/i.test(e));
    const onlyBootstrap = realErrors.every((e) => /401 \(Unauthorized\)/.test(e)) && bootstrap401;
    realErrors.length === 0
      ? pass("g2", "aucune erreur console")
      : onlyBootstrap
      ? pass("g2", `aucune erreur applicative (${realErrors.length} × 401 attendus sur /auth/me avant login)`)
      : fail("g2", realErrors.length + " erreurs : " + realErrors.slice(0, 5).join(" | "));
  } catch (err) {
    fail("FATAL", err.message);
    await ss(page, "fatal");
  }

  console.log("\n═══════════════ RÉSUMÉ ═══════════════");
  const ok = RESULTS.filter((r) => r.ok).length;
  const ko = RESULTS.filter((r) => r.ok === false);
  console.log(`${ok}/${RESULTS.length} OK`);
  ko.forEach((r) => console.log(`  ❌ ${r.id}: ${r.d}`));
  await browser.close();
  process.exit(ko.length ? 1 : 0);
})();
