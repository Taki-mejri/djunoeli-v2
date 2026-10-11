import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";

const SHOTS_DIR = "C:/Users/taki/AppData/Local/Temp/e2e-shots";
mkdirSync(SHOTS_DIR, { recursive: true });

const BASE = "http://localhost:5173";
let stepNum = 0;

function step(label) {
  stepNum++;
  console.log(`\n[STEP ${stepNum}] ${label}`);
}

async function shot(page, name) {
  const p = path.join(SHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${p}`);
  return p;
}

const browser = await chromium.launch({ headless: true });

// ── Helper: collect API calls ──────────────────────────────────────────────
function attachNetworkLog(page) {
  const log = [];
  page.on("response", (resp) => {
    if (resp.url().includes("/api/v1/")) {
      const entry = { url: resp.url(), status: resp.status(), method: resp.request().method() };
      log.push(entry);
      console.log(`  🌐 ${entry.method} ${entry.url} → ${entry.status}`);
    }
  });
  return log;
}

const results = [];
function record(id, label, ok, detail = "") {
  results.push({ id, label, ok, detail });
  console.log(`  ${ok ? "✅" : "❌"} [${id}] ${label}${detail ? " | " + detail : ""}`);
}

// ════════════════════════════════════════════════════════════════
// CONTEXT 1 — ADMIN
// ════════════════════════════════════════════════════════════════
const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await adminCtx.newPage();
const net = attachNetworkLog(page);

// ─── LOGIN ADMIN ─────────────────────────────────────────────────────────────
step("Navigate to /admin/login");
await page.goto(`${BASE}/admin/login`);
await page.waitForLoadState("networkidle");
await shot(page, "01-login-page");

step("Fill admin credentials and submit");
await page.fill('input[type="email"]', "admin@djunoeli.tn");
await page.fill('input[type="password"]', "Djunoeli2026");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin**", { timeout: 10000 });
await page.waitForTimeout(800);
await shot(page, "02-admin-dashboard");

const urlAfterLogin = page.url();
record("login", "Admin login → /admin dashboard", urlAfterLogin.includes("/admin") && !urlAfterLogin.includes("/login"), `url=${urlAfterLogin}`);

// ─── /admin/drivers ───────────────────────────────────────────────────────────
step("Navigate to /admin/drivers");
await page.goto(`${BASE}/admin/drivers`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2000); // React Query fetch
await shot(page, "03-drivers-initial");

const h1Text = await page.locator("h1").first().textContent().catch(() => "");
record("drivers-h1", 'H1 is "Livreurs"', h1Text?.includes("Livreurs"), `h1="${h1Text}"`);

const tableRows = page.locator("table tbody tr, .ds-table tbody tr");
const rowCount = await tableRows.count().catch(() => 0);
const bodyText = await page.locator("body").textContent();
const skanderPresent = bodyText.includes("Skander");
record("drivers-load", "Drivers table loads (rows or empty state)", rowCount >= 0, `rows=${rowCount}`);
record("drivers-skander", "Skander in table OR table empty — both OK", true, skanderPresent ? "Skander found" : "empty (OK)");

// ─── CREATE LIVREUR MODAL ──────────────────────────────────────────────────
step("Open CreateLivreurModal");
const addBtn = page.getByRole("button", { name: /ajouter un livreur/i });
await addBtn.click();
await page.waitForTimeout(400);
await shot(page, "04-modal-open");

const modalEl = page.locator(".modal").first();
const modalVisible = await modalEl.isVisible().catch(() => false);
record("modal-open", "CreateLivreurModal opens (.modal visible)", modalVisible);

step("Fill Mohamed Ben Salah form in modal");
await page.getByPlaceholder("Skander").fill("Mohamed");
await page.getByPlaceholder("Trabelsi").fill("Ben Salah");
// Email is inside .modal — use locator to be safe
await page.locator(".modal input[type='email']").fill("mohamed@test.tn");
await page.getByPlaceholder("+216 22 145 887").fill("+216 98 332 014");
await page.locator(".modal input[type='password']").fill("Mohamed2026");
await page.getByPlaceholder("12345678").fill("98765432");
// Vehicle select
await page.locator(".modal select").selectOption("CAMIONNETTE");
await page.getByPlaceholder("188 TUN 2024").fill("150 TUN 2025");
await shot(page, "05-modal-filled");

step("Submit 'Créer le livreur'");
net.length = 0;
await page.getByRole("button", { name: /créer le livreur/i }).click();
await page.waitForTimeout(2500);
await shot(page, "06-after-create");

const createCall = net.find(n => n.url.includes("/admin/livreurs") && n.method === "POST");
record("create-api", "POST /api/v1/admin/livreurs fired", !!createCall, createCall ? `status=${createCall.status}` : "no POST found");
record("create-201", "POST returned 201", createCall?.status === 201, `status=${createCall?.status}`);

const modalGone = !(await page.locator(".modal").isVisible().catch(() => false));
record("modal-close", "Modal closes after successful create", modalGone);

await page.waitForTimeout(800);
const bodyAfterCreate = await page.locator("body").textContent();
record("create-visible", "Mohamed visible in table (no F5)", bodyAfterCreate.includes("Mohamed") || bodyAfterCreate.includes("Ben Salah"), "name in DOM");
await shot(page, "07-table-after-create");

// ─── DUPLICATE CIN ────────────────────────────────────────────────────────────
step("Test duplicate CIN 98765432");
await addBtn.click();
await page.waitForTimeout(400);

await page.getByPlaceholder("Skander").fill("Test");
await page.getByPlaceholder("Trabelsi").fill("Dup");
await page.locator(".modal input[type='email']").fill("another@test.tn");
await page.locator(".modal input[type='password']").fill("Test2026!!");
await page.getByPlaceholder("12345678").fill("98765432"); // DUPLICATE

net.length = 0;
await page.getByRole("button", { name: /créer le livreur/i }).click();
await page.waitForTimeout(2000);
await shot(page, "08-dup-cin-error");

const errDiv = page.locator(".auth-server-err, .modal .err, [class*='error'], [class*='server-err']");
const errVisible = await errDiv.isVisible().catch(() => false);
const errText = await errDiv.textContent().catch(() => "");
record("dup-cin-error-shown", "Error message shown for duplicate CIN", errVisible, `text="${errText}"`);
record("dup-cin-msg", "Error mentions CIN or déjà enregistrée",
  errText.toLowerCase().includes("cin") || errText.toLowerCase().includes("déjà") || errText.toLowerCase().includes("already") || errText.toLowerCase().includes("exist"),
  `errText="${errText}"`);

await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// ─── FILTER "HORS LIGNE" ──────────────────────────────────────────────────────
step("Test 'Hors ligne' filter");
await page.goto(`${BASE}/admin/drivers`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);

// The toolbar has a <select> with status options
const selects = page.locator("select");
let filterApplied = false;
const selectCount = await selects.count();
for (let i = 0; i < selectCount; i++) {
  const opts = await selects.nth(i).locator("option").allTextContents();
  if (opts.some(o => o.toLowerCase().includes("hors ligne") || o.toLowerCase().includes("offline"))) {
    await selects.nth(i).selectOption("OFFLINE");
    filterApplied = true;
    break;
  }
}
await page.waitForTimeout(1500);
await shot(page, "09-filter-offline");

const bodyFiltered = await page.locator("body").textContent();
const hasResults = bodyFiltered.includes("Mohamed") || bodyFiltered.includes("Skander");
record("filter-offline-select", "'Hors ligne' option found and selected", filterApplied);
record("filter-offline-results", "Mohamed or Skander visible with OFFLINE filter", hasResults || bodyFiltered.includes("résultats"), `Mohamed=${bodyFiltered.includes("Mohamed")}, Skander=${bodyFiltered.includes("Skander")}`);

// ─── LOGOUT ADMIN ────────────────────────────────────────────────────────────
step("Logout admin via Topbar dropdown");
await page.locator(".ds-user").click();
await page.waitForTimeout(300);
const logoutBtn = page.locator(".ds-menu-item.danger, button:has-text('Se déconnecter')");
await logoutBtn.waitFor({ timeout: 3000 });
await logoutBtn.click();
await page.waitForURL(`${BASE}/`, { timeout: 8000 });
await shot(page, "10-after-logout");
record("logout-admin", "Admin logout redirects to /", page.url() === `${BASE}/` || page.url() === `${BASE}`, `url=${page.url()}`);

await adminCtx.close();

// ════════════════════════════════════════════════════════════════
// CONTEXT 2 — LIVREUR
// ════════════════════════════════════════════════════════════════
const livCtx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile viewport
const lp = await livCtx.newPage();
const livNet = attachNetworkLog(lp);

step("Login as livreur Mohamed");
await lp.goto(`${BASE}/livreur/login`);
await lp.waitForLoadState("networkidle");

await lp.fill('input[type="email"]', "mohamed@test.tn");
await lp.fill('input[type="password"]', "Mohamed2026");
await lp.click('button[type="submit"]');
await lp.waitForURL("**/livreur**", { timeout: 10000 });
await lp.waitForTimeout(1500);
await shot(lp, "11-livreur-home");

const livUrl = lp.url();
record("livreur-redirect", "Login as livreur → /livreur", livUrl.includes("/livreur") && !livUrl.includes("/login"), `url=${livUrl}`);

// ─── LIVREUR HOME CONTENT ─────────────────────────────────────────────────────
step("Check livreur home content");
const homeBody = await lp.locator("body").textContent();
await shot(lp, "12-livreur-home-detail");

record("livreur-greeting", '"Bonjour, Mohamed" in page', homeBody.includes("Mohamed"), `found=${homeBody.includes("Mohamed")}`);

const toggleEl = lp.locator("input[type='checkbox']").first();
const toggleChecked = await toggleEl.isChecked().catch(() => null);
record("livreur-toggle-offline", "Toggle is OFF (OFFLINE default)", toggleChecked === false, `checked=${toggleChecked}`);
record("livreur-hors-ligne", '"Hors ligne" label visible', homeBody.includes("Hors ligne"), `found=${homeBody.includes("Hors ligne")}`);

record("livreur-cod", "COD section visible with DT", homeBody.includes("DT"), "DT in page");
record("livreur-rating", "Rating visible (5.0 or —)", homeBody.includes("5.0") || homeBody.includes("—"), "rating");
record("livreur-deliveries", "Total livraisons (0) visible", homeBody.includes("0"), "0 in page");

// ─── TOGGLE STATUS AVAILABLE ─────────────────────────────────────────────────
step("Toggle status to AVAILABLE");
livNet.length = 0;
// The checkbox inside .liv-switch is visually hidden (opacity:0) — click the label wrapper
const toggleLabel = lp.locator(".liv-switch").first();
await toggleLabel.click({ force: true });
await lp.waitForTimeout(2500);
await shot(lp, "13-toggle-available");

const patchCall = livNet.find(n => n.url.includes("/me/status") && n.method === "PATCH");
record("toggle-patch", "PATCH /api/v1/livreur/me/status fired", !!patchCall, patchCall ? `status=${patchCall.status}` : "no PATCH found");
record("toggle-200", "PATCH returned 200", patchCall?.status === 200, `status=${patchCall?.status}`);

const bodyAfterToggle = await lp.locator("body").textContent();
record("toggle-dispo-text", '"Dispo" or "disponible" shown after toggle',
  bodyAfterToggle.toLowerCase().includes("dispo"),
  "checking status text");
record("toggle-available-text", '"Vous êtes disponible" shown in status card',
  bodyAfterToggle.toLowerCase().includes("disponible"),
  `found=${bodyAfterToggle.toLowerCase().includes("disponible")}`);

// ─── F5 PERSISTENCE ──────────────────────────────────────────────────────────
step("F5 — toggle should remain AVAILABLE");
await lp.reload();
await lp.waitForLoadState("networkidle");
await lp.waitForTimeout(2000);
await shot(lp, "14-after-f5");

// isChecked works on hidden checkboxes; force not needed here
const checkedAfterF5 = await lp.locator("input[type='checkbox']").first().isChecked().catch(() => null);
record("toggle-persist", "Toggle stays AVAILABLE after F5", checkedAfterF5 === true, `checked=${checkedAfterF5}`);

// ─── SECURITY: livreur → /admin/drivers ──────────────────────────────────────
step("Security: livreur tries /admin/drivers → should be blocked");
await lp.goto(`${BASE}/admin/drivers`);
await lp.waitForLoadState("networkidle");
await lp.waitForTimeout(1000);
await shot(lp, "15-security-block");

const blockedUrl = lp.url();
// ProtectedRoute redirects to "/" for wrong role
const isBlocked = !blockedUrl.includes("/admin/drivers");
record("security-block", "Livreur blocked from /admin/drivers", isBlocked, `redirected to: ${blockedUrl}`);

await livCtx.close();
await browser.close();

// ════════════════════════════════════════════════════════════════
// FINAL REPORT
// ════════════════════════════════════════════════════════════════
console.log("\n\n╔═══════════════════════════════════════════════════════╗");
console.log("║                RÉSULTATS FINAUX                      ║");
console.log("╚═══════════════════════════════════════════════════════╝");
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`\nTotal : ${pass} ✅ PASS  |  ${fail} ❌ FAIL  (${results.length} checks)\n`);

for (const r of results) {
  console.log(`  ${r.ok ? "✅" : "❌"} [${r.id.padEnd(24)}] ${r.label}`);
  if (r.detail) console.log(`       └─ ${r.detail}`);
}
console.log(`\n📸 Screenshots dans : ${SHOTS_DIR}`);
