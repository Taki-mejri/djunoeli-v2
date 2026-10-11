/**
 * Continuation du test finance : filtres factures + rapports (f) + admin (g) + sécurité (h).
 * (a-e déjà validés dans test-finance.js avant un bug de sélecteur strict sur les tabs.)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots-finance");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 15;
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  console.log("\n=== Login Farah pour continuer (factures filtres + rapports) ===");
  await page.goto(`${BASE}/finance/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').first().fill("farah@djunoeli.tn");
  await page.locator('input[type="password"]').first().fill("Farah2026");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // ────────────────────────────────────────────────────────────────
  // STEP e (suite) — Filtres factures
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP e (suite): Filtres factures ===");
  await page.goto(`${BASE}/finance/factures`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  await page.locator(".fin-tab").nth(1).click(); // Impayées
  await page.waitForTimeout(500);
  await ss(page, "factures-filter-unpaid");
  const unpaidBody = await page.locator("body").innerText();
  const hasPayeeInUnpaid = /Marquer payée/.test(unpaidBody);

  await page.locator(".fin-tab").nth(2).click(); // Payées
  await page.waitForTimeout(500);
  await ss(page, "factures-filter-paid");
  const paidBody = await page.locator("body").innerText();

  await page.locator(".fin-tab").nth(0).click(); // Toutes
  await page.waitForTimeout(500);
  pass("STEPe-filters", `Filtres cliqués sans erreur (Impayées contient bouton payer=${hasPayeeInUnpaid})`);

  // ────────────────────────────────────────────────────────────────
  // STEP f — Rapports
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP f: Rapports ===");
  await page.locator('a[href="/finance/rapports"]').first().click();
  await page.waitForURL("**/finance/rapports", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
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
  // STEP g — Accès admin
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
  // STEP h — Sécurité
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

  console.log("\n" + "═".repeat(70));
  console.log("SUMMARY (continuation)");
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
})();
