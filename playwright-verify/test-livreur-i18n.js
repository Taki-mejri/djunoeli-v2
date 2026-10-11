/**
 * Étape 3/6 — Vérification i18n de l'espace Livreur / PWA (FR / DE)
 *
 * Couvre a) → h) :
 *   a) login livreur + prérequis courses actives
 *   b) espace en FR
 *   c) bascule Deutsch (liste, compteur, nav, statuts, détail)
 *   d) actions en DE (bouton principal selon statut, modale COD, modale échec, feuille appel)
 *   e) rebascule FR
 *   f) sélecteur de langue présent dans l'espace livreur
 *   g) responsive PWA 390px en DE
 *   h) aucun warning missingKey / aucun libellé FR résiduel
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const SS_DIR = path.join(__dirname, "screenshots-livreur-i18n");
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

async function switchLang(page, code) {
  await page.click(".liv-topbar .lang-btn");
  await page.click(`.lang-menu .lang-item:has-text("${code === "de" ? "Deutsch" : "Français"}")`);
  await page.waitForTimeout(500);
}

/** Ouvre le détail de la course portant ce numéro de suivi */
async function openJob(page, tracking) {
  await page.click(`.liv-job-card:has-text("${tracking}")`);
  await page.waitForURL(/\/livreur\/jobs\/[^/]+$/, { timeout: 15000 });
  await page.waitForTimeout(1200);
}

async function backToList(page) {
  await page.click(".liv-page > .liv-back");
  await page.waitForURL(/\/livreur\/jobs$/, { timeout: 15000 });
  await page.waitForTimeout(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Viewport PWA mobile — l'espace livreur est mobile-first
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const missingKeys = [];
  const httpFails = [];
  page.on("console", (msg) => {
    const txt = msg.text();
    if (/missingKey|i18next::translator/i.test(txt)) missingKeys.push(txt);
    else if (msg.type() === "error") consoleErrors.push(txt);
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) httpFails.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });

  try {
    // ============ a) LOGIN LIVREUR ============
    console.log("\n─── a) Login livreur ───");
    await page.goto(`${BASE}/livreur/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("i18nextLng", "fr"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', "skander@test.tn");
    await page.fill('input[type="password"]', "Skander2026");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith("/livreur") && !u.pathname.includes("login"), { timeout: 20000 });
    await page.waitForTimeout(1600);
    pass("a1", "connecté en tant que livreur → " + new URL(page.url()).pathname);
    await ss(page, "home-fr");

    await page.click('.liv-bottom a[href="/livreur/jobs"]');
    await page.waitForTimeout(1600);
    const cards = await page.$$(".liv-job-card");
    cards.length >= 1
      ? pass("a2", `prérequis OK : ${cards.length} course(s) active(s) assignée(s) à Skander`)
      : fail("a2", "aucune course active — prérequis non rempli");

    // ============ b) EN FRANÇAIS ============
    console.log("\n─── b) Espace en français ───");
    let body = await page.textContent("body");
    const n = cards.length;
    const frList = ["Mes courses", `${n} courses actives`];
    const frMiss = frList.filter((s) => !body.includes(s));
    frMiss.length === 0
      ? pass("b1", `liste FR OK : "Mes courses" · "${n} courses actives"`)
      : fail("b1", "manquant en FR : " + frMiss.join(", "));

    const navFR = await page.textContent(".liv-bottom");
    ["Accueil", "Courses", "COD", "Profil"].every((s) => navFR.includes(s))
      ? pass("b2", "nav basse en FR : Accueil · Courses · COD · Profil")
      : fail("b2", "nav FR incomplète : " + navFR.replace(/\s+/g, " "));
    await ss(page, "liste-fr");

    await openJob(page, "TRK-2026-00007");
    body = await page.textContent("body");
    const frDetail = ["Destinataire", "Appeler", "Noter l'appel", "Carte", "Ramassage", "Suivi", "Signaler un échec", "Marquer comme livré"];
    const frDetailMiss = frDetail.filter((s) => !body.includes(s));
    frDetailMiss.length === 0
      ? pass("b3", "détail + boutons en français")
      : fail("b3", "manquant en FR : " + frDetailMiss.join(", "));
    await ss(page, "detail-fr");

    // ============ c) BASCULE DEUTSCH ============
    console.log("\n─── c) Bascule Deutsch ───");
    await switchLang(page, "de");
    body = await page.textContent("body");
    const deDetail = ["Empfänger", "Anrufen", "Anruf notieren", "Karte", "Abholung", "Verfolgung", "Fehler melden", "Als zugestellt markieren"];
    const deDetailMiss = deDetail.filter((s) => !body.includes(s));
    deDetailMiss.length === 0
      ? pass("c1", "détail traduit : " + deDetail.slice(0, 5).join(" · "))
      : fail("c1", "manquant en DE : " + deDetailMiss.join(", "));

    const frLeft = ["Destinataire", "Appeler", "Noter l'appel", "Ramassage", "Signaler un échec", "Expéditeur :"].filter((s) => body.includes(s));
    frLeft.length === 0
      ? pass("c2", "aucun libellé FR résiduel sur le détail")
      : fail("c2", "FR resté en dur : " + frLeft.join(", "));

    // Statut de la course traduit (OUT_FOR_DELIVERY → In Zustellung)
    const badge = (await page.textContent(".liv-detail-head .liv-badge")).trim();
    badge === "In Zustellung"
      ? pass("c3", `statut traduit : "${badge}"`)
      : fail("c3", `statut non traduit : "${badge}"`);

    // Mini-timeline : statuts + notes système traduits
    const tl = await page.textContent(".liv-timeline");
    const tlFR = ["Ramassé", "En route", "En livraison", "Colis créé", "Au dépôt", "À ramasser"].filter((s) => tl.includes(s));
    tlFR.length === 0
      ? pass("c4", "mini-timeline traduite : " + tl.replace(/\s+/g, " ").trim().slice(0, 90))
      : fail("c4", "mini-timeline encore en FR : " + tlFR.join(", "));

    await backToList(page);
    body = await page.textContent("body");
    body.includes("Meine Aufträge") && body.includes(`${n} aktive Aufträge`)
      ? pass("c5", `liste traduite : "Meine Aufträge" · "${n} aktive Aufträge" (pluriel DE correct)`)
      : fail("c5", "liste DE incorrecte : " + body.replace(/\s+/g, " ").slice(0, 140));

    const navDE = await page.textContent(".liv-bottom");
    ["Start", "Aufträge", "Nachnahme", "Profil"].every((s) => navDE.includes(s))
      ? pass("c6", "nav basse traduite : Start · Aufträge · Nachnahme · Profil")
      : fail("c6", "nav DE incomplète : " + navDE.replace(/\s+/g, " "));

    // Statuts des cartes de la liste
    const badges = [...new Set(await page.$$eval(".liv-job-card .liv-badge", (els) => els.map((e) => e.textContent.trim())))];
    const frStatuses = ["À ramasser", "Ramassé", "Au dépôt", "En route", "En livraison", "Livré", "Échec"];
    const badBadges = badges.filter((b) => frStatuses.includes(b));
    badBadges.length === 0 && badges.length > 0
      ? pass("c7", "statuts de la liste traduits : " + badges.join(", "))
      : fail("c7", "statuts encore en FR : " + badBadges.join(", "));
    await ss(page, "liste-de");

    // ============ d) ACTIONS EN ALLEMAND ============
    console.log("\n─── d) Actions en allemand ───");
    // d1 — bouton principal selon le statut
    const mainBtnFor = async (tracking, expected) => {
      await openJob(page, tracking);
      const label = (await page.textContent(".liv-btn-main")).replace(/\s+/g, " ").trim();
      const ok = label.includes(expected);
      ok ? pass("d1:" + tracking, `bouton principal = "${label}" (attendu "${expected}")`)
         : fail("d1:" + tracking, `bouton = "${label}", attendu "${expected}"`);
      return ok;
    };
    await mainBtnFor("TRK-2026-00003", "Auftrag starten");      // AWAITING_PICKUP
    await backToList(page);
    await mainBtnFor("TRK-2026-00010", "Unterwegs");            // PICKED_UP
    await backToList(page);
    await mainBtnFor("TRK-2026-00007", "Als zugestellt markieren"); // OUT_FOR_DELIVERY

    // d2 — modale de livraison avec COD (on vérifie les libellés, sans confirmer)
    await page.click(".liv-btn-main");
    await page.waitForTimeout(600);
    const sheet = await page.textContent(".liv-sheet");
    const deliveryDE = ["Zustellung bestätigen", "Einzuziehender Betrag", "200 DT", "in bar eingezogen", "Zugestellt · 200 DT eingezogen"];
    const dMiss = deliveryDE.filter((s) => !sheet.includes(s));
    dMiss.length === 0
      ? pass("d2", "modale livraison COD en DE (titre + montant + warning + bouton)")
      : fail("d2", "modale livraison DE incomplète : " + dMiss.join(" | "));
    await ss(page, "modale-livraison-de");
    await page.click(".liv-sheet .liv-btn-ghost"); // Abbrechen
    await page.waitForTimeout(400);

    // d3 — modale d'échec + raisons rapides
    await page.click(".liv-btn-fail");
    await page.waitForTimeout(600);
    const failSheet = await page.textContent(".liv-sheet");
    const failDE = ["Zustellung fehlgeschlagen", "Empfänger abwesend", "Adresse nicht auffindbar", "Falsche Nummer", "Kunde verweigert die Sendung", "Auf Kundenwunsch verschoben", "Fehler bestätigen"];
    const fMiss = failDE.filter((s) => !failSheet.includes(s));
    fMiss.length === 0
      ? pass("d3", "modale échec + 5 raisons rapides en DE")
      : fail("d3", "modale échec DE incomplète : " + fMiss.join(" | "));
    await ss(page, "modale-echec-de");
    await page.click(".liv-sheet .liv-btn-ghost");
    await page.waitForTimeout(400);

    // d4 — feuille "noter l'appel"
    await page.click(".liv-contact-btn.log");
    await page.waitForTimeout(600);
    const callSheet = await page.textContent(".liv-sheet");
    const callDE = ["Anrufergebnis", "Hat geantwortet", "Keine Antwort", "Verschoben", "Falsche Nummer"];
    const cMiss = callDE.filter((s) => !callSheet.includes(s));
    cMiss.length === 0
      ? pass("d4", "feuille appel en DE : " + callDE.slice(1).join(" · "))
      : fail("d4", "feuille appel DE incomplète : " + cMiss.join(" | "));
    await ss(page, "feuille-appel-de");

    // d5 — action réelle : enregistrer un appel → bandeau traduit
    await page.click('.liv-call-opt:has-text("Keine Antwort")');
    await page.waitForTimeout(1500);
    const bannerDE = (await page.textContent(".liv-banner").catch(() => "")).trim();
    bannerDE.includes("Anruf gespeichert")
      ? pass("d5", `action exécutée en DE, bandeau traduit : "${bannerDE}"`)
      : fail("d5", `bandeau non traduit : "${bannerDE}"`);

    // d6 — le bandeau se re-traduit au changement de langue (clé, pas texte figé)
    await switchLang(page, "fr");
    const bannerFR = (await page.textContent(".liv-banner").catch(() => "")).trim();
    bannerFR.includes("Appel enregistré")
      ? pass("d6", `le MÊME bandeau repasse en FR : "${bannerFR}" (stocké comme clé)`)
      : fail("d6", `bandeau non re-traduit : "${bannerFR}"`);

    // ============ e) REBASCULE FR ============
    console.log("\n─── e) Retour en français ───");
    body = await page.textContent("body");
    const backFR = ["Destinataire", "Appeler", "Noter l'appel", "Carte", "Ramassage", "Suivi", "Signaler un échec"];
    const backMiss = backFR.filter((s) => !body.includes(s));
    backMiss.length === 0
      ? pass("e1", "détail entièrement revenu en français")
      : fail("e1", "retour FR incomplet : " + backMiss.join(", "));
    await ss(page, "detail-retour-fr");

    await backToList(page);
    body = await page.textContent("body");
    body.includes("Mes courses") && !body.includes("Meine Aufträge")
      ? pass("e2", "liste revenue en français")
      : fail("e2", "liste non revenue en FR");

    // ============ f) SÉLECTEUR PRÉSENT DANS L'ESPACE LIVREUR ============
    console.log("\n─── f) Sélecteur de langue dans l'espace livreur ───");
    const onList = await page.isVisible(".liv-topbar .lang-btn");
    await openJob(page, "TRK-2026-00007");
    const onDetail = await page.isVisible(".liv-topbar .lang-btn");
    await page.click('.liv-bottom a[href="/livreur/profile"]');
    await page.waitForTimeout(1200);
    const onProfileTop = await page.isVisible(".liv-topbar .lang-btn");
    const onProfileRow = await page.isVisible(".liv-prof-row .lang-btn");
    onList && onDetail && onProfileTop && onProfileRow
      ? pass("f", "sélecteur présent sur liste + détail + profil (topbar .liv-shell) et dans la ligne « Langue » du profil")
      : fail("f", `présence : liste=${onList} détail=${onDetail} profil-topbar=${onProfileTop} profil-ligne=${onProfileRow}`);

    // ============ g) RESPONSIVE PWA 390px EN DE ============
    console.log("\n─── g) Responsive PWA 390px en allemand ───");
    await page.setViewportSize({ width: 390, height: 844 });
    await switchLang(page, "de");
    await page.waitForTimeout(600);
    await ss(page, "profil-de-390");

    await page.click('.liv-bottom a[href="/livreur/jobs"]');
    await page.waitForTimeout(1500);
    // Aucun débordement horizontal
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    // Les libellés de la nav basse ne doivent pas être tronqués/vides
    const navLabels = await page.$$eval(".liv-tab-lbl", (els) => els.map((e) => e.textContent.trim()));
    overflow <= 0 && navLabels.every((l) => l.length > 0)
      ? pass("g1", `390px : aucun débordement horizontal, nav DE lisible (${navLabels.join(" · ")})`)
      : fail("g1", `390px : débordement=${overflow}px, nav=${navLabels.join("|")}`);
    await ss(page, "liste-de-390");

    await openJob(page, "TRK-2026-00007");
    const overflow2 = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    const btnLabel = (await page.textContent(".liv-btn-main")).replace(/\s+/g, " ").trim();
    overflow2 <= 0 && btnLabel.includes("Als zugestellt markieren")
      ? pass("g2", `390px détail : pas de débordement, bouton DE complet "${btnLabel}"`)
      : fail("g2", `390px détail : débordement=${overflow2}px, bouton="${btnLabel}"`);
    await ss(page, "detail-de-390");

    // ============ h) CONSOLE ============
    console.log("\n─── h) Console ───");
    missingKeys.length === 0
      ? pass("h1", "aucun warning i18next missingKey")
      : fail("h1", missingKeys.length + " missingKey : " + missingKeys.slice(0, 5).join(" | "));
    console.log("  ℹ️  réponses HTTP >=400 : " + (httpFails.join(" | ") || "aucune"));
    const bootstrapOnly = httpFails.length === 0 || httpFails.every((f) => /^401 (GET|POST) .*\/auth\/(me|refresh)$/.test(f));
    const realErrors = consoleErrors.filter((e) => !/favicon|manifest|404 \(Not Found\)/i.test(e));
    const onlyBootstrap = realErrors.every((e) => /401 \(Unauthorized\)/.test(e)) && bootstrapOnly;
    realErrors.length === 0
      ? pass("h2", "aucune erreur console")
      : onlyBootstrap
      ? pass("h2", `aucune erreur applicative (${realErrors.length} × 401 attendus sur /auth avant login)`)
      : fail("h2", realErrors.length + " erreurs : " + realErrors.slice(0, 5).join(" | "));
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
