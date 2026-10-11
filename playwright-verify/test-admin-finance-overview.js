/**
 * End-to-end test — Page supervision financière dans l'espace admin (/admin/finance)
 * Suit le checklist a→e fourni par l'utilisateur.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots-admin-finance");
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
const API = "http://localhost:4000/api/v1";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  const netLog = [];
  page.on("response", (resp) => {
    if (resp.url().includes(`${API}/finance/`)) {
      netLog.push(`${resp.request().method()} ${resp.url().replace(API, "")} → ${resp.status()}`);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // STEP a — Login admin
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP a: Login admin@djunoeli.tn ===");
  await page.goto(`${BASE}/admin/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').first().fill("admin@djunoeli.tn");
  await page.locator('input[type="password"]').first().fill("Djunoeli2026");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  const urlAfterLogin = page.url();
  if (urlAfterLogin.includes("/admin") && !urlAfterLogin.includes("/login")) {
    pass("STEPa-login", `Connecté → ${urlAfterLogin}`);
  } else {
    fail("STEPa-login", `Mauvaise URL après login: ${urlAfterLogin}`);
  }
  await ss(page, "admin-home");

  // ────────────────────────────────────────────────────────────────
  // STEP b — Clique "Finance" dans la sidebar
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP b: Sidebar → Finance ===");
  const financeLink = page.locator('a[href="/admin/finance"]').first();
  const financeLinkCount = await financeLink.count();
  if (financeLinkCount > 0) pass("STEPb-navlink", "Lien 'Finance' présent dans la sidebar admin");
  else fail("STEPb-navlink", "Lien 'Finance' introuvable dans la sidebar");

  await financeLink.click();
  await page.waitForURL("**/admin/finance", { timeout: 5000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await ss(page, "admin-finance-page");

  const heroCount = await page.locator(".fin-hero").count();
  if (heroCount === 1) pass("STEPb-hero", "Hero CA affiché");
  else fail("STEPb-hero", `.fin-hero trouvé ${heroCount} fois (attendu 1)`);

  const cardCount = await page.locator(".fin-card").count();
  if (cardCount === 4) pass("STEPb-cards", "4 cartes de trésorerie affichées");
  else fail("STEPb-cards", `${cardCount} cartes trouvées (attendu 4)`);

  const splitCount = await page.locator(".admin-fin-split").count();
  const colCount = await page.locator(".admin-fin-split > div").count();
  if (splitCount === 1 && colCount === 2) {
    pass("STEPb-split", "2 colonnes : aperçu Soldes livreurs + COD expéditeurs");
  } else {
    fail("STEPb-split", `split=${splitCount} colonnes=${colCount} (attendu 1 / 2)`);
  }

  const livreurRowsCount = await page.locator(".admin-fin-split > div").nth(0).locator(".fin-row").count();
  const expRowsCount = await page.locator(".admin-fin-split > div").nth(1).locator(".fin-row").count();
  pass("STEPb-toplists", `Top livreurs: ${livreurRowsCount} ligne(s), top expéditeurs: ${expRowsCount} ligne(s) (max 5 chacun)`);
  if (livreurRowsCount > 5 || expRowsCount > 5) {
    fail("STEPb-top5", `Dépassement de la limite top 5 (livreurs=${livreurRowsCount} expéditeurs=${expRowsCount})`);
  } else {
    pass("STEPb-top5", "Limite top 5 respectée pour les deux colonnes");
  }

  const ctaCount = await page.locator(".admin-fin-cta").count();
  if (ctaCount === 1) pass("STEPb-cta", "Bandeau CTA vers les rapports affiché");
  else fail("STEPb-cta", `.admin-fin-cta trouvé ${ctaCount} fois (attendu 1)`);

  // ────────────────────────────────────────────────────────────────
  // STEP c — Liens
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP c: Vérification des liens ===");

  // "Ouvrir l'espace Finance" → /finance
  const openFinanceLink = page.locator('a[href="/finance"]').first();
  await openFinanceLink.click();
  await page.waitForURL("**/finance", { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  const urlOpenFinance = page.url();
  if (urlOpenFinance.endsWith("/finance")) {
    pass("STEPc-openfinance", `"Ouvrir l'espace Finance" → ${urlOpenFinance} (pas de redirection, accès SUPER_ADMIN OK)`);
  } else {
    fail("STEPc-openfinance", `URL inattendue: ${urlOpenFinance}`);
  }
  await ss(page, "opened-finance-space");

  // Retour à /admin/finance pour tester les autres liens
  await page.goto(`${BASE}/admin/finance`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  const manageLivreursLink = page.locator('a[href="/finance/livreurs"]').first();
  await manageLivreursLink.click();
  await page.waitForURL("**/finance/livreurs", { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  if (page.url().endsWith("/finance/livreurs")) pass("STEPc-gerer-livreurs", `"Gérer →" (livreurs) → ${page.url()}`);
  else fail("STEPc-gerer-livreurs", `URL inattendue: ${page.url()}`);

  await page.goto(`${BASE}/admin/finance`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  const manageExpLink = page.locator('a[href="/finance/expediteurs"]').first();
  await manageExpLink.click();
  await page.waitForURL("**/finance/expediteurs", { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  if (page.url().endsWith("/finance/expediteurs")) pass("STEPc-gerer-expediteurs", `"Gérer →" (expéditeurs) → ${page.url()}`);
  else fail("STEPc-gerer-expediteurs", `URL inattendue: ${page.url()}`);

  await page.goto(`${BASE}/admin/finance`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);

  const reportsLink = page.locator('a[href="/finance/rapports"]').first();
  await reportsLink.click();
  await page.waitForURL("**/finance/rapports", { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  if (page.url().endsWith("/finance/rapports")) pass("STEPc-rapports", `"Voir les rapports →" → ${page.url()}`);
  else fail("STEPc-rapports", `URL inattendue: ${page.url()}`);
  await ss(page, "reports-via-cta");

  // ────────────────────────────────────────────────────────────────
  // STEP d — Network
  // ────────────────────────────────────────────────────────────────
  console.log("\n=== STEP d: Appels réseau /finance/* ===");
  await page.goto(`${BASE}/admin/finance`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const overviewCall = netLog.find((l) => l.includes("GET /finance/overview"));
  const livreurCall = netLog.find((l) => l.includes("GET /finance/livreur-balances"));
  const expCall = netLog.find((l) => l.includes("GET /finance/expediteur-cod"));

  if (overviewCall?.includes("200")) pass("STEPd-overview", overviewCall);
  else fail("STEPd-overview", "Pas de GET /finance/overview → 200 observé: " + (overviewCall ?? "aucun"));

  if (livreurCall?.includes("200")) pass("STEPd-livreurs", livreurCall);
  else fail("STEPd-livreurs", "Pas de GET /finance/livreur-balances → 200 observé: " + (livreurCall ?? "aucun"));

  if (expCall?.includes("200")) pass("STEPd-expediteurs", expCall);
  else fail("STEPd-expediteurs", "Pas de GET /finance/expediteur-cod → 200 observé: " + (expCall ?? "aucun"));

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
  console.log("\nNETWORK LOG (/finance/*):");
  netLog.forEach((l) => console.log("  🌐 " + l));

  if (consoleErrors.length) {
    console.log("\nBROWSER CONSOLE ERRORS:");
    consoleErrors.forEach((e) => console.log("  ⚠️", e));
  } else {
    console.log("\nBROWSER CONSOLE ERRORS: none");
  }

  await browser.close();
  console.log("\n📁 Screenshots:", SS_DIR);
})();
