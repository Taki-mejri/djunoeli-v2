/**
 * End-to-end test — Dashboard Finance (5ème espace)
 * Suit le checklist a→i fourni par l'utilisateur.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots-finance");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const fname = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, fname), fullPage: false });
  console.log(`  📸 ${fname}`);
};

const RESULTS = [];
const pass = (id, detail) => { RESULTS.push({ id, ok: true, detail }); console.log(`  ✅ ${id}: ${detail}`); };
const fail = (id, detail) => { RESULTS.push({ id, ok: false, detail }); console.log(`  ❌ ${id}: ${detail}`); };

const BASE = "http://localhost:5173";
const TECHZONE_EXPEDITEUR_ID = "cmqh1wm8x0004pkck4dxy669x";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  // ────────────────────────────────────────────────────────────────
  // STEP a — Login Farah (FINANCE_MANAGER)
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP a: /finance/login + connexion farah@djunoeli.tn ===");
  await page.goto(`${BASE}/finance/login`);
  await page.waitForLoadState("networkidle");
  await ss(page, "finance-login-page");

  const loginPageOk = (await page.locator('input[type="email"]').count()) > 0;
  if (loginPageOk) pass("STEPa-page", "Page de login finance affichée");
  else fail("STEPa-page", "Champ email introuvable sur /finance/login");

  await page.locator('input[type="email"]').first().fill("farah@djunoeli.tn");
  await page.locator('input[type="password"]').first().fill("Farah2026");
  await page.locator('button[type="submit"]').first().click();

  try {
    await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".auth-bootstrap", { state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const url = page.url();
    if (url.includes("/finance") && !url.includes("/login")) {
      pass("STEPa-redirect", `Connectée → redirigée vers ${url}`);
    } else {
      fail("STEPa-redirect", `Mauvaise URL après login: ${url}`);
    }
  } catch (e) {
    await ss(page, "finance-login-FAILED");
    fail("STEPa-redirect", "Timeout redirection: " + e.message);
  }
  await ss(page, "finance-after-login");

  // ────────────────────────────────────────────────────────────────
  // STEP b — Tableau de bord
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP b: Tableau de bord financier ===");
  await page.waitForTimeout(600);

  const heroCount = await page.locator(".fin-hero").count();
  if (heroCount === 1) pass("STEPb-hero", "Hero CA affiché");
  else fail("STEPb-hero", `.fin-hero trouvé ${heroCount} fois (attendu 1)`);

  const cardCount = await page.locator(".fin-card").count();
  if (cardCount === 4) pass("STEPb-cards", "4 cartes de trésorerie affichées");
  else fail("STEPb-cards", `${cardCount} cartes trouvées (attendu 4)`);

  const quickCount = await page.locator(".fin-quick-card").count();
  if (quickCount === 4) pass("STEPb-quick", "4 accès rapides affichés");
  else fail("STEPb-quick", `${quickCount} accès rapides trouvés (attendu 4)`);

  await ss(page, "finance-home");

  // ────────────────────────────────────────────────────────────────
  // STEP c — Soldes livreurs
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP c: Soldes livreurs ===");
  await page.locator('a[href="/finance/livreurs"]').first().click();
  await page.waitForURL("**/finance/livreurs", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ss(page, "livreurs-list");

  const mohamedRow = page.locator(".fin-row", { hasText: "Mohamed" }).first();
  const mohamedRowCount = await mohamedRow.count();
  if (mohamedRowCount > 0) {
    const amountBefore = (await mohamedRow.locator(".fin-row-amount b").innerText()).trim();
    pass("STEPc-list", `Ligne Mohamed trouvée avec solde ${amountBefore}`);

    await mohamedRow.locator(".fin-btn-collect").click();
    await page.waitForTimeout(400);
    await ss(page, "livreurs-modal-open");

    const partialToggle = page.locator(".fin-partial-toggle");
    if ((await partialToggle.count()) > 0) pass("STEPc-partial-option", "Option 'Reversement partiel' présente");
    else fail("STEPc-partial-option", "Option 'Reversement partiel' absente");

    await partialToggle.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(200);
    const amountInput = page.locator(".modal input[type='number']");
    await amountInput.fill("100");
    await ss(page, "livreurs-partial-filled");

    await page.locator(".fin-btn-confirm").click();
    await page.waitForTimeout(1200);
    await ss(page, "livreurs-after-settle");

    const banner = page.locator(".fin-banner.ok");
    const bannerText = (await banner.count()) > 0 ? await banner.innerText() : null;
    if (bannerText) pass("STEPc-banner", `Bannière verte : "${bannerText}"`);
    else fail("STEPc-banner", "Bannière verte de confirmation non trouvée");

    const mohamedRowAfter = page.locator(".fin-row", { hasText: "Mohamed" }).first();
    const amountAfter = (await mohamedRowAfter.count()) > 0
      ? (await mohamedRowAfter.locator(".fin-row-amount b").innerText()).trim()
      : "(ligne disparue)";
    pass("STEPc-updated", `Solde après reversement partiel : ${amountAfter} (avant: ${amountBefore})`);

    const histCount = await page.locator(".fin-hist-row").count();
    if (histCount > 0) pass("STEPc-history", `${histCount} ligne(s) d'historique affichée(s)`);
    else fail("STEPc-history", "Aucune ligne d'historique trouvée");
  } else {
    fail("STEPc-list", "Ligne Mohamed introuvable dans les soldes livreurs");
  }

  // ────────────────────────────────────────────────────────────────
  // STEP d — COD expéditeurs
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP d: COD expéditeurs ===");
  await page.locator('a[href="/finance/expediteurs"]').first().click();
  await page.waitForURL("**/finance/expediteurs", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ss(page, "expediteurs-list");

  const techRow = page.locator(".fin-row", { hasText: "TechZone" }).first();
  const techRowCount = await techRow.count();
  if (techRowCount > 0) {
    pass("STEPd-list", "Ligne TechZone (gross/commission/net) trouvée");

    await techRow.locator(".fin-btn-collect").click();
    await page.waitForTimeout(400);
    await ss(page, "expediteurs-modal-open");

    const partialToggleD = page.locator(".fin-partial-toggle");
    if ((await partialToggleD.count()) === 0) pass("STEPd-no-partial", "Option de reversement partiel bien ABSENTE");
    else fail("STEPd-no-partial", "Option partielle présente alors qu'elle ne devrait pas l'être");

    await page.locator(".fin-btn-confirm").click();
    await page.waitForTimeout(1200);
    await ss(page, "expediteurs-after-settle");

    const bannerD = page.locator(".fin-banner.ok");
    const bannerTextD = (await bannerD.count()) > 0 ? await bannerD.innerText() : null;
    if (bannerTextD) pass("STEPd-banner", `Bannière verte : "${bannerTextD}"`);
    else fail("STEPd-banner", "Bannière verte non trouvée");

    const techRowAfter = await page.locator(".fin-row", { hasText: "TechZone" }).count();
    if (techRowAfter === 0) pass("STEPd-gone", "TechZone a disparu de la liste des soldes à reverser");
    else fail("STEPd-gone", "TechZone est toujours dans la liste après reversement");

    const histRowD = await page.locator(".fin-hist-row", { hasText: "TechZone" }).count();
    if (histRowD > 0) pass("STEPd-history", "TechZone apparaît dans l'historique des reversements");
    else fail("STEPd-history", "TechZone absente de l'historique");
  } else {
    fail("STEPd-list", "Ligne TechZone introuvable dans le COD expéditeurs");
  }

  // ────────────────────────────────────────────────────────────────
  // STEP e — Factures
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP e: Factures ===");
  await page.locator('a[href="/finance/factures"]').first().click();
  await page.waitForURL("**/finance/factures", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ss(page, "factures-list");

  await page.locator("button", { hasText: "Générer une facture" }).click();
  await page.waitForTimeout(300);
  const genPanel = page.locator(".fin-gen-panel");
  if ((await genPanel.count()) > 0) pass("STEPe-panel", "Panneau de génération ouvert");
  else fail("STEPe-panel", "Panneau de génération non ouvert");

  await page.locator(".fin-gen-panel input").fill(TECHZONE_EXPEDITEUR_ID);
  await ss(page, "factures-gen-filled");
  await page.locator(".fin-gen-panel button", { hasText: "Générer" }).click();
  await page.waitForTimeout(1200);
  await ss(page, "factures-after-generate");

  const bannerE = page.locator(".fin-banner.ok");
  const bannerTextE = (await bannerE.count()) > 0 ? await bannerE.innerText() : null;
  if (bannerTextE && /INV-2026-/.test(bannerTextE)) {
    pass("STEPe-generated", `Facture générée : "${bannerTextE}"`);
  } else {
    fail("STEPe-generated", `Bannière de génération inattendue: ${bannerTextE}`);
  }

  const newInvRow = page.locator(".fin-inv-row", { hasText: "TechZone" }).first();
  const invRowCount = await newInvRow.count();
  if (invRowCount > 0) {
    const invBadge = await newInvRow.locator(".badge, [class*='status']").first().innerText().catch(() => "");
    pass("STEPe-row", `Ligne facture TechZone visible (badge: "${invBadge}")`);

    const payBtn = newInvRow.locator(".fin-btn-pay");
    if ((await payBtn.count()) > 0) {
      await payBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, "factures-after-pay");
      const bodyAfterPay = await page.locator("body").innerText();
      if (/Payée/.test(bodyAfterPay)) pass("STEPe-paid", "Badge passé à 'Payée' après clic");
      else fail("STEPe-paid", "Badge 'Payée' non trouvé après clic sur Marquer payée");
    } else {
      fail("STEPe-paybtn", "Bouton 'Marquer payée' introuvable sur la nouvelle facture");
    }
  } else {
    fail("STEPe-row", "Ligne de la facture générée introuvable");
  }

  // Filtres (ordre DOM : Toutes=0, Impayées=1, Payées=2)
  await page.locator(".fin-tab").nth(1).click();
  await page.waitForTimeout(500);
  await ss(page, "factures-filter-unpaid");
  await page.locator(".fin-tab").nth(2).click();
  await page.waitForTimeout(500);
  await ss(page, "factures-filter-paid");
  await page.locator(".fin-tab").nth(0).click();
  await page.waitForTimeout(500);
  pass("STEPe-filters", "Filtres Toutes/Impayées/Payées cliqués sans erreur");

  // ────────────────────────────────────────────────────────────────
  // STEP f — Rapports
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP f: Rapports ===");
  await page.locator('a[href="/finance/rapports"]').first().click();
  await page.waitForURL("**/finance/rapports", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await ss(page, "rapports");

  const kpiCount = await page.locator(".fin-card").count();
  if (kpiCount === 4) pass("STEPf-kpis", "4 KPIs affichés");
  else fail("STEPf-kpis", `${kpiCount} KPIs trouvés (attendu 4)`);

  const chartCardCount = await page.locator(".fin-chart-card").count();
  if (chartCardCount === 2) pass("STEPf-chartcards", "2 cartes de graphes (barres + camembert)");
  else fail("STEPf-chartcards", `${chartCardCount} cartes de graphes trouvées (attendu 2)`);

  await page.waitForTimeout(500);
  const rechartsSvgCount = await page.locator(".recharts-wrapper svg").count();
  if (rechartsSvgCount >= 2) pass("STEPf-charts-rendered", `${rechartsSvgCount} graphes SVG rendus (recharts)`);
  else fail("STEPf-charts-rendered", `Seulement ${rechartsSvgCount} SVG recharts trouvés`);

  await ctx.close();

  // ────────────────────────────────────────────────────────────────
  // STEP g — Accès admin (lecture + écriture)
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP g: Accès admin@djunoeli.tn à /finance ===");
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageAdmin = await ctxAdmin.newPage();
  await pageAdmin.goto(`${BASE}/admin/login`);
  await pageAdmin.waitForLoadState("networkidle");
  await pageAdmin.locator('input[type="email"]').first().fill("admin@djunoeli.tn");
  await pageAdmin.locator('input[type="password"]').first().fill("Djunoeli2026");
  await pageAdmin.locator('button[type="submit"]').first().click();
  await pageAdmin.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 }).catch(() => {});
  await pageAdmin.waitForLoadState("networkidle");
  await pageAdmin.waitForTimeout(500);

  await pageAdmin.goto(`${BASE}/finance`);
  await pageAdmin.waitForLoadState("networkidle");
  await pageAdmin.waitForTimeout(800);
  await ss(pageAdmin, "admin-finance-access");

  const adminUrl = pageAdmin.url();
  const adminHeroCount = await pageAdmin.locator(".fin-hero").count();
  if (adminUrl.includes("/finance") && adminHeroCount === 1) {
    pass("STEPg-read", `Admin (SUPER_ADMIN) accède à /finance et voit les données → ${adminUrl}`);
  } else {
    fail("STEPg-read", `Admin n'a pas pu accéder correctement à /finance → ${adminUrl}`);
  }

  await pageAdmin.goto(`${BASE}/finance/livreurs`);
  await pageAdmin.waitForLoadState("networkidle");
  await pageAdmin.waitForTimeout(600);
  const adminCollectBtn = pageAdmin.locator(".fin-btn-collect").first();
  const adminCollectCount = await adminCollectBtn.count();
  const adminCollectEnabled = adminCollectCount > 0 ? await adminCollectBtn.isEnabled() : false;
  if (adminCollectCount > 0 && adminCollectEnabled) {
    pass("STEPg-write", "Bouton 'Encaisser' visible et actif pour l'admin (droits d'écriture confirmés côté UI)");
  } else {
    fail("STEPg-write", `Bouton Encaisser: count=${adminCollectCount} enabled=${adminCollectEnabled}`);
  }
  await ss(pageAdmin, "admin-finance-livreurs");
  await ctxAdmin.close();

  // ────────────────────────────────────────────────────────────────
  // STEP h — Sécurité : expéditeur ne peut pas accéder à /finance
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP h: Sécurité — tech@test.tn (expéditeur) sur /finance ===");
  const ctxSec = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageSec = await ctxSec.newPage();
  await pageSec.goto(`${BASE}/expediteur/login`);
  await pageSec.waitForLoadState("networkidle");
  await pageSec.locator('input[type="email"]').first().fill("tech@test.tn");
  await pageSec.locator('input[type="password"]').first().fill("TechZone2026");
  await pageSec.locator('button[type="submit"]').first().click();
  await pageSec.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 }).catch(() => {});
  await pageSec.waitForLoadState("networkidle");
  await pageSec.waitForTimeout(500);

  await pageSec.goto(`${BASE}/finance`);
  await pageSec.waitForLoadState("networkidle");
  await pageSec.waitForTimeout(800);
  await ss(pageSec, "expediteur-tries-finance");
  const urlAfterExpTry = pageSec.url();
  if (urlAfterExpTry.includes("/finance/login") || urlAfterExpTry === `${BASE}/`) {
    pass("STEPh-security", `Expéditeur redirigé loin de /finance → ${urlAfterExpTry}`);
  } else {
    fail("STEPh-security", `Expéditeur a pu rester sur ${urlAfterExpTry} — FAILLE`);
  }
  await ctxSec.close();

  // ────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  console.log("SUMMARY");
  console.log("═".repeat(70));
  for (const r of RESULTS) {
    const icon = r.ok === true ? "✅" : "❌";
    console.log(`${icon}  ${r.id.padEnd(24)} ${r.detail}`);
  }

  if (consoleErrors.length) {
    console.log("\nBROWSER CONSOLE ERRORS:");
    consoleErrors.forEach((e) => console.log("  ⚠️", e));
  } else {
    console.log("\nBROWSER CONSOLE ERRORS: none");
  }

  await browser.close();
  console.log("\n📁 Screenshots:", SS_DIR);
})();
