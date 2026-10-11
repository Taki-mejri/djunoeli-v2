/**
 * Vérification de la page de suivi public /track :
 *   PARTIE 1 — suivi par numéro de suivi (TRK-...)
 *   PARTIE 2 — suivi par téléphone + OTP (mode simulation)
 *
 * Couvre :
 *   a) 2 onglets sur /track (non connecté) + entrée "Suivi" dans le menu landing
 *   b) onglet code : saisie TRK → URL /track/TRK-..., timeline, étape courante (pulse)
 *   c) lien direct /track/TRK-... dans un contexte non connecté → pré-rempli
 *   d) code bidon → "Colis introuvable"
 *   e) livré / en cours / annulé
 *   f) onglet téléphone : demande d'OTP → code lu dans les LOGS BACKEND → liste des colis
 *   g) mauvais code → "N tentative(s) restante(s)"
 *   h) bascule FR/DE (onglets + panneau OTP + étapes + statuts) ; gouvernorats non traduits
 *   i) sécurité : réponses réseau brutes sans donnée perso ni code OTP
 *   j) 390px
 *   k) aucun warning i18next missingKey, aucune clé brute affichée
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const API_LOG = process.env.API_LOG || path.join(process.env.TEMP || "/tmp", "api.log");
const PHONE = "22555777";        // 5 colis en base
const TRK_DELIVERED = "TRK-2026-00012";
const TRK_INPROGRESS = "TRK-2026-00007";
const TRK_CANCELLED = "TRK-2026-00013";
const TRK_FAKE = "TRK-INEXISTANT";

const SS_DIR = path.join(__dirname, "screenshots-public-track");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const f = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, f), fullPage: true });
  return f;
};

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok, detail });
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

/** Lit le dernier code OTP à 6 chiffres écrit dans les logs du backend. */
const readOtpFromLogs = () => {
  const log = fs.readFileSync(API_LOG, "utf8");
  const matches = [...log.matchAll(/Code\s+:\s+(\d{6})/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
};

(async () => {
  const browser = await chromium.launch();
  // Contexte VIERGE = non connecté (aucun cookie, aucun token)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // --- collecte des warnings i18next + des réponses réseau publiques ---
  const missingKeys = [];
  page.on("console", (m) => {
    const txt = m.text();
    if (/missingKey/i.test(txt)) missingKeys.push(txt);
  });
  const apiBodies = [];
  page.on("response", async (r) => {
    if (!/\/api\/v1\/public\//.test(r.url())) return;
    let body = "";
    try { body = await r.text(); } catch { /* ignore */ }
    apiBodies.push({ url: r.url(), status: r.status(), body });
  });

  try {
    /* ================= PARTIE 1 — suivi par code ================= */
    console.log("\n=== a) /track non connecté : page + onglets + menu ===");
    await page.goto(`${BASE}/track`, { waitUntil: "networkidle" });

    const cookies = await ctx.cookies();
    check("contexte réellement non connecté (0 cookie)", cookies.length === 0, `${cookies.length} cookie(s)`);

    const h1 = (await page.locator(".trk-hero h1").innerText()).trim();
    check("titre de la page affiché", h1.length > 0, `"${h1}"`);

    const tabs = await page.locator(".trk-tab").allInnerTexts();
    check("2 onglets présents", tabs.length === 2, JSON.stringify(tabs));

    const menuSuivi = page.locator('.nav-links a[href="/track"]');
    check("entrée « Suivi » dans le menu de la landing", (await menuSuivi.count()) === 1,
      (await menuSuivi.count()) ? `"${(await menuSuivi.first().innerText()).trim()}"` : "absente");
    const hasFooter = await page.locator("footer").count();
    check("menu + footer de la landing conservés", hasFooter > 0);
    const langSel = await page.locator(".lang-select").count();
    check("sélecteur de langue FR/DE présent sur /track", langSel === 1);
    console.log(`  [ss] ${await ss(page, "track-vide")}`);

    console.log("\n=== b) onglet code : recherche d'un colis livré ===");
    await page.fill(".trk-search input", TRK_DELIVERED);
    await page.click(".trk-search button");
    await page.waitForSelector(".trk-result", { timeout: 10000 });
    check("URL mise à jour", page.url().endsWith(`/track/${TRK_DELIVERED}`), page.url());

    const steps = await page.locator(".trk-step").count();
    const reached = await page.locator(".trk-step.reached").count();
    check("timeline à 6 étapes, toutes cochées (colis livré)", steps === 6 && reached === 6, `${reached}/${steps}`);
    const badge = (await page.locator(".trk-badge").innerText()).trim();
    check("badge de statut « Livré »", badge === "Livré", `"${badge}"`);
    const city = (await page.locator(".trk-info-item b").first().innerText()).trim();
    check("ville de destination affichée", city.length > 0, `"${city}"`);

    const pageText = await page.locator(".trk-result").innerText();
    const leaks = ["Firas", "+21627112233", "27 112 233", "Avenue Farhat Hached", "TechZone"]
      .filter((v) => pageText.includes(v));
    check("aucune donnée personnelle rendue dans la page", leaks.length === 0, leaks.join(", ") || "rien");
    console.log(`  [ss] ${await ss(page, "track-livre")}`);

    console.log("\n=== e) colis en cours : étape courante mise en avant ===");
    await page.goto(`${BASE}/track/${TRK_INPROGRESS}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".trk-result", { timeout: 10000 });
    const cur = page.locator(".trk-step.current");
    check("une étape « courante » (pulse)", (await cur.count()) === 1);
    const curLabel = (await cur.locator(".trk-step-label").innerText()).trim();
    const anim = await cur.locator(".trk-step-dot").evaluate((el) => getComputedStyle(el).animationName);
    check("animation pulse active sur l'étape courante", anim === "trk-pulse", `animation-name=${anim}`);
    const reached2 = await page.locator(".trk-step.reached").count();
    check("étapes suivantes non cochées", reached2 === 5, `${reached2}/6 cochées, courante="${curLabel}"`);
    console.log(`  [ss] ${await ss(page, "track-en-cours")}`);

    console.log("\n=== c) lien direct dans un onglet neuf non connecté ===");
    const page2 = await ctx.newPage();
    await page2.goto(`${BASE}/track/${TRK_DELIVERED}`, { waitUntil: "networkidle" });
    await page2.waitForSelector(".trk-result", { timeout: 10000 });
    const prefill = await page2.inputValue(".trk-search input");
    check("champ pré-rempli + résultat direct", prefill === TRK_DELIVERED, `champ="${prefill}"`);
    await page2.close();

    console.log("\n=== e bis) colis annulé : encart spécial, pas de timeline ===");
    await page.goto(`${BASE}/track/${TRK_CANCELLED}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".trk-result", { timeout: 10000 });
    const special = await page.locator(".trk-special").count();
    const timeline = await page.locator(".trk-timeline").count();
    const specialTxt = special ? (await page.locator(".trk-special").innerText()).trim() : "";
    check("encart spécial affiché et timeline masquée", special === 1 && timeline === 0, `"${specialTxt}"`);
    console.log(`  [ss] ${await ss(page, "track-annule")}`);

    console.log("\n=== d) code bidon ===");
    await page.goto(`${BASE}/track/${TRK_FAKE}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".trk-notfound", { timeout: 10000 });
    const nfTitle = (await page.locator(".trk-notfound h3").innerText()).trim();
    check("message « Colis introuvable » propre", nfTitle === "Colis introuvable", `"${nfTitle}"`);
    console.log(`  [ss] ${await ss(page, "track-introuvable")}`);

    /* ================= PARTIE 2 — suivi par téléphone + OTP ================= */
    console.log("\n=== f) onglet téléphone : demande d'OTP ===");
    await page.goto(`${BASE}/track`, { waitUntil: "networkidle" });
    await page.click(".trk-tab:nth-child(2)");
    await page.waitForSelector(".otp-panel", { timeout: 5000 });
    check("panneau OTP affiché (étape téléphone)", (await page.locator(".otp-panel").count()) === 1);

    await page.fill(".otp-field input", PHONE);
    const beforeCodes = (fs.readFileSync(API_LOG, "utf8").match(/Code\s+:\s+\d{6}/g) || []).length;
    await page.click(".otp-btn");
    await page.waitForSelector(".otp-field-code", { timeout: 10000 });

    const hint = await page.locator(".otp-hint").count();
    const hintTxt = hint ? (await page.locator(".otp-hint").innerText()).trim() : "";
    check("hint « mode démo » affiché", hint === 1, `"${hintTxt}"`);

    const afterCodes = (fs.readFileSync(API_LOG, "utf8").match(/Code\s+:\s+\d{6}/g) || []).length;
    const otp = readOtpFromLogs();
    check("code à 6 chiffres écrit dans les LOGS BACKEND", afterCodes === beforeCodes + 1 && /^\d{6}$/.test(otp || ""),
      `code lu dans les logs = ${otp}`);
    console.log(`  [ss] ${await ss(page, "otp-etape-code")}`);

    console.log("\n=== g) mauvais code ===");
    await page.fill(".otp-field-code input", "000000");
    await page.click(".otp-btn");
    await page.waitForSelector(".otp-error", { timeout: 10000 });
    const errTxt = (await page.locator(".otp-error").innerText()).trim();
    check("message « N tentative(s) restante(s) »", /tentative\(s\) restante\(s\)/.test(errTxt), `"${errTxt}"`);
    console.log(`  [ss] ${await ss(page, "otp-mauvais-code")}`);

    console.log("\n=== f bis) bon code → liste des colis ===");
    await page.fill(".otp-field-code input", otp);
    await page.click(".otp-btn");
    await page.waitForSelector(".otp-results", { timeout: 10000 });
    const nShip = await page.locator(".otp-ship").count();
    const countTxt = (await page.locator(".otp-results-head p").innerText()).trim();
    check("liste des colis du numéro affichée", nShip === 5, `${nShip} colis — "${countTxt}"`);

    const first = page.locator(".otp-ship").first();
    const firstTrk = (await first.locator(".otp-ship-trk").innerText()).trim();
    const firstStatus = (await first.locator(".otp-ship-status").innerText()).trim();
    const firstSub = (await first.locator(".otp-ship-sub").innerText()).trim();
    check("chaque ligne montre tracking + statut + ville", /^TRK-/.test(firstTrk) && firstStatus.length > 0 && firstSub.length > 0,
      `${firstTrk} | ${firstStatus} | ${firstSub}`);

    const listText = await page.locator(".otp-results").innerText();
    const listLeaks = [PHONE, "22 555 777", "+216"].filter((v) => listText.includes(v));
    check("aucune donnée personnelle dans la liste", listLeaks.length === 0, listLeaks.join(", ") || "rien");
    console.log(`  [ss] ${await ss(page, "otp-liste-colis")}`);

    console.log("\n=== f ter) clic sur un colis → /track/TRK-... ===");
    await first.click();
    await page.waitForSelector(".trk-result", { timeout: 10000 });
    check("navigation vers le détail du colis", page.url().endsWith(`/track/${firstTrk}`), page.url());
    const activeTab = (await page.locator(".trk-tab.active").innerText()).trim();
    check("onglet « code » forcé à l'arrivée par URL", activeTab === "Par numéro de suivi", `onglet actif = "${activeTab}"`);
    console.log(`  [ss] ${await ss(page, "otp-detail-colis")}`);

    /* ================= h) FR / DE ================= */
    console.log("\n=== h) bascule FR → DE ===");
    await page.goto(`${BASE}/track/${TRK_INPROGRESS}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".trk-result", { timeout: 10000 });
    const frTitle = (await page.locator(".trk-hero h1").innerText()).trim();
    const frTabs = await page.locator(".trk-tab").allInnerTexts();
    const frSteps = await page.locator(".trk-step-label").allInnerTexts();
    const frBadge = (await page.locator(".trk-badge").innerText()).trim();
    const frCity = (await page.locator(".trk-info-item b").first().innerText()).trim();

    await page.click(".lang-btn");
    await page.click('.lang-item:has-text("Deutsch")');
    await page.waitForFunction(() => document.querySelector(".trk-hero h1")?.textContent?.includes("Verfolgen"), null, { timeout: 5000 });

    const deTitle = (await page.locator(".trk-hero h1").innerText()).trim();
    const deTabs = await page.locator(".trk-tab").allInnerTexts();
    const deSteps = await page.locator(".trk-step-label").allInnerTexts();
    const deBadge = (await page.locator(".trk-badge").innerText()).trim();
    const deCity = (await page.locator(".trk-info-item b").first().innerText()).trim();

    check("titre traduit", frTitle !== deTitle, `FR "${frTitle}" → DE "${deTitle}"`);
    check("onglets traduits", JSON.stringify(frTabs) !== JSON.stringify(deTabs), `${JSON.stringify(frTabs)} → ${JSON.stringify(deTabs)}`);
    check("étapes traduites", JSON.stringify(frSteps) !== JSON.stringify(deSteps), `${frSteps[3]} → ${deSteps[3]}`);
    check("statut traduit", frBadge !== deBadge, `"${frBadge}" → "${deBadge}"`);
    check("gouvernorat NON traduit", frCity === deCity, `"${frCity}" = "${deCity}"`);
    const menuDe = (await page.locator('.nav-links a[href="/track"]').innerText()).trim();
    check("entrée de menu traduite", menuDe === "Sendungsverfolgung", `"${menuDe}"`);
    console.log(`  [ss] ${await ss(page, "track-de")}`);

    console.log("\n=== h bis) panneau OTP en DE ===");
    await page.goto(`${BASE}/track`, { waitUntil: "networkidle" });
    await page.click(".trk-tab:nth-child(2)");
    await page.waitForSelector(".otp-panel", { timeout: 5000 });
    const deOtpTitle = (await page.locator(".otp-panel h3").innerText()).trim();
    const deOtpBtn = (await page.locator(".otp-btn").innerText()).trim();
    check("panneau OTP traduit en DE", deOtpTitle === "Verfolgung per Telefon" && deOtpBtn === "Code erhalten",
      `"${deOtpTitle}" / "${deOtpBtn}"`);
    console.log(`  [ss] ${await ss(page, "otp-de")}`);

    // retour FR
    await page.click(".lang-btn");
    await page.click('.lang-item:has-text("Français")');
    await page.waitForFunction(() => document.querySelector(".trk-hero h1")?.textContent?.includes("Suivez"), null, { timeout: 5000 });
    check("rebascule FR OK", true);

    /* ================= j) 390px ================= */
    console.log("\n=== j) 390px ===");
    const mob = await ctx.newPage();
    await mob.setViewportSize({ width: 390, height: 844 });
    await mob.goto(`${BASE}/track/${TRK_INPROGRESS}`, { waitUntil: "networkidle" });
    await mob.waitForSelector(".trk-result", { timeout: 10000 });
    const overflowX = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("aucun débordement horizontal (page détail)", overflowX <= 1, `débordement = ${overflowX}px`);
    const stepVisible = await mob.locator(".trk-step").first().isVisible();
    const tabsVisible = await mob.locator(".trk-tab").first().isVisible();
    check("timeline et onglets visibles en 390px", stepVisible && tabsVisible);
    console.log(`  [ss] ${await ss(mob, "mobile-390-detail")}`);

    await mob.goto(`${BASE}/track`, { waitUntil: "networkidle" });
    await mob.click(".trk-tab:nth-child(2)");
    await mob.waitForSelector(".otp-panel", { timeout: 5000 });
    const overflowX2 = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("aucun débordement horizontal (panneau OTP)", overflowX2 <= 1, `débordement = ${overflowX2}px`);
    console.log(`  [ss] ${await ss(mob, "mobile-390-otp")}`);
    await mob.close();

    /* ================= i) sécurité réseau ================= */
    console.log("\n=== i) réponses réseau brutes ===");
    const FORBIDDEN = ["receiverName", "receiverPhone", "receiverEmail", "deliveryAddress",
      "codAmount", "senderName", "senderPhone", "pickupAddress", "deliveryPrice", "codeHash"];
    const badResp = [];
    for (const r of apiBodies) {
      const hits = FORBIDDEN.filter((f) => new RegExp(`"${f}"`).test(r.body));
      if (hits.length) badResp.push(`${r.url} → ${hits.join(",")}`);
    }
    check(`aucune clé personnelle dans les ${apiBodies.length} réponses /api/v1/public/* observées`,
      badResp.length === 0, badResp.join(" | ") || "rien");

    const reqResp = apiBodies.filter((r) => r.url.includes("/otp/request"));
    const codeInReq = reqResp.filter((r) => /\d{6}/.test(r.body));
    check("le code OTP n'est jamais renvoyé par /otp/request", codeInReq.length === 0,
      reqResp.length ? reqResp[0].body : "aucune réponse capturée");

    const verifyResp = apiBodies.filter((r) => r.url.includes("/otp/verify") && r.status === 200);
    check("réponse /otp/verify sans numéro de téléphone", verifyResp.every((r) => !r.body.includes(PHONE)),
      verifyResp.length ? `${verifyResp.length} réponse(s) 200 vérifiée(s)` : "aucune");

    /* ================= k) missingKey ================= */
    console.log("\n=== k) i18next ===");
    check("aucun warning missingKey", missingKeys.length === 0, missingKeys.slice(0, 3).join(" | ") || "rien");

    const bodyTxt = await page.locator(".trk-page").innerText();
    const rawKeys = bodyTxt.match(/\b(otp|tabs|steps|special)\.[a-zA-Z]+/g) || [];
    check("aucune clé i18n brute affichée", rawKeys.length === 0, rawKeys.join(", ") || "rien");
  } catch (e) {
    check("EXCEPTION", false, String(e).split("\n")[0]);
    try { console.log(`  [ss] ${await ss(page, "erreur")}`); } catch { /* ignore */ }
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + "=".repeat(60));
  console.log(`RESULTAT : ${results.length - failed.length}/${results.length} verifications OK`);
  if (failed.length) {
    console.log("ECHECS :");
    for (const f of failed) console.log(`  - ${f.label} — ${f.detail}`);
  }
  console.log(`Captures : ${SS_DIR}`);
  process.exit(failed.length ? 1 : 0);
})();
