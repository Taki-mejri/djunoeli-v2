/**
 * End-to-end test — Expéditeurs CRUD
 *
 * Fixes vs v1:
 *  - waitForURL(/admin/) matched /admin/login itself → now waits for URL NOT containing "login"
 *  - Internal navigation done via sidebar clicks (preserves Zustand in-memory store)
 *  - page.goto() only used for initial public pages (login)
 *  - Proper waits for React Query data to load (waits for table rows, not just networkidle)
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const fname = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, fname), fullPage: false });
  console.log(`  📸 ${fname}`);
};

const RESULTS = [];
const pass  = (id, detail) => { RESULTS.push({ id, ok: true,  detail }); console.log(`  ✅ ${id}: ${detail}`); };
const fail  = (id, detail) => { RESULTS.push({ id, ok: false, detail }); console.log(`  ❌ ${id}: ${detail}`); };
const probe = (id, detail) => { RESULTS.push({ id, ok: null,  detail }); console.log(`  🔍 ${id}: ${detail}`); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const consoleWarns  = [];
  page.on("console", (msg) => {
    if (msg.type() === "error")   consoleErrors.push(msg.text());
    if (msg.type() === "warning") consoleWarns.push(msg.text());
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  // Log API responses for debugging
  page.on("response", async (resp) => {
    if (resp.url().includes("/api/v1/")) {
      const status = resp.status();
      const short = resp.url().replace("http://localhost:4000/api/v1", "");
      if (status >= 400 || short.includes("auth/login") || short.includes("expediteurs")) {
        let body = "";
        try { body = await resp.text().catch(() => ""); } catch {}
        console.log(`  🌐 ${resp.request().method()} ${short} → ${status} ${body.slice(0, 120)}`);
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 1 — Admin login
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 1: Admin login ===");
  await page.goto("http://localhost:5173/admin/login");
  await page.waitForLoadState("networkidle");
  await ss(page, "admin-login-page");

  await page.locator('input[type="email"]').first().fill("admin@djunoeli.tn");
  await page.locator('input[type="password"]').first().fill("Djunoeli2026");
  await ss(page, "admin-login-filled");

  await page.locator('button[type="submit"]').first().click();

  // Wait for URL to leave /admin/login (i.e. redirect to /admin)
  try {
    // waitForURL predicate receives a URL object in Playwright 1.61 — use .href
    await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".auth-bootstrap", { state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await ss(page, "admin-after-login");

    const url = page.url();
    if (url.includes("/admin") && !url.includes("/login")) {
      pass("STEP1", `Login OK → redirected to ${url}`);
    } else {
      fail("STEP1", `Login failed — still on ${url}`);
    }
  } catch (e) {
    await ss(page, "admin-login-FAILED");
    fail("STEP1", "Timeout waiting for redirect away from /admin/login: " + e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP 2 — Navigate to /admin/expediteurs via sidebar click
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 2: Navigate to Expéditeurs ===");
  const step1Passed = RESULTS.find(r => r.id === "STEP1")?.ok;
  if (!step1Passed) {
    fail("STEP2-data", "Skipped (login failed)");
    fail("STEP3-create", "Skipped");
    fail("STEP4-search", "Skipped");
    fail("STEP5-clear",  "Skipped");
    fail("STEP6-filter", "Skipped");
    console.log("  ⚠️  Steps 2-6 skipped because login failed");
    // jump to summary
  } else {
  // Click the "Expéditeurs" sidebar link (no full-page reload = Zustand state preserved)
  const expLink = page.locator('a[href="/admin/expediteurs"], a:has-text("Expéditeurs")').first();
  await expLink.click();
  await page.waitForURL("**/admin/expediteurs", { timeout: 5000 }).catch(() => {});

  // Wait for actual data rows (React Query fetch)
  try {
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
  } catch {
    await page.waitForTimeout(3000); // fallback
  }
  await ss(page, "expediteurs-list-loaded");

  const bodyText = await page.locator("body").innerText();
  const hasTechZone = bodyText.includes("TechZone");
  const hasMedina   = bodyText.includes("Medina Store");
  const hasMock     = bodyText.includes("mockData") || bodyText.includes("lorem");

  if (hasTechZone && hasMedina) {
    pass("STEP2-data", `Both TechZone & Medina Store visible — real API data`);
  } else {
    fail("STEP2-data", `Missing: TechZone=${hasTechZone} MedinaStore=${hasMedina}`);
  }
  probe("STEP2-mock", `Mock data present: ${hasMock}`);

  // Row count
  const rowCount = await page.locator("table tbody tr").count();
  probe("STEP2-rows", `Table has ${rowCount} row(s)`);

  // ──────────────────────────────────────────────────────────────────
  // STEP 3 — Create FastShip via modal
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 3: Create FastShip ===");

  // Find the "New" button
  const newBtn = page.locator('button:has-text("Nouvel"), button:has-text("Ajouter"), button:has-text("+ Nouvel")').first();
  const newBtnCount = await newBtn.count();
  if (newBtnCount === 0) {
    // try any button with "+"
    const plusBtn = page.locator("button").filter({ hasText: /\+/ }).first();
    await plusBtn.click();
  } else {
    await newBtn.click();
  }
  await page.waitForTimeout(600);
  await ss(page, "create-modal-open");

  // Check modal is visible
  const modal = page.locator('dialog[open], [role="dialog"], .modal, form').first();
  probe("STEP3-modal", `Modal visible: ${await modal.isVisible().catch(() => false)}`);

  // Fill all inputs using label-based strategy
  const labelFill = async (labels, value) => {
    for (const lbl of labels) {
      // Try label[for=] → input#id
      const label = page.locator(`label`).filter({ hasText: new RegExp(lbl, "i") }).first();
      if (await label.count() > 0) {
        const forId = await label.getAttribute("for").catch(() => null);
        if (forId) {
          const inp = page.locator(`#${forId}`);
          if (await inp.count() > 0) { await inp.fill(value); return lbl; }
        }
        // sibling input
        const sib = label.locator("~ input, + input, ~ * input").first();
        if (await sib.count() > 0) { await sib.fill(value); return lbl; }
      }
      // placeholder fallback
      const inp = page.locator(`input[placeholder*="${lbl}" i]`).first();
      if (await inp.count() > 0) { await inp.fill(value); return lbl; }
    }
    return null;
  };

  const r1 = await labelFill(["Société", "societe", "company", "raison"], "FastShip");
  const r2 = await labelFill(["Contact", "contact", "referent"], "Karim Bou");
  const r3 = await labelFill(["Email", "email", "e-mail"], "fast@test.tn");
  const r4 = await labelFill(["Téléphone", "telephone", "phone", "tel"], "+216 55 000 111");
  const r5 = await labelFill(["Mot de passe", "password", "passe"], "FastShip2026");
  const r6 = await labelFill(["Ville", "ville", "city"], "Sousse");

  console.log(`  Fields filled: Société=${r1} Contact=${r2} Email=${r3} Tel=${r4} Pass=${r5} Ville=${r6}`);
  await ss(page, "create-modal-filled");

  const rowsBefore = await page.locator("table tbody tr").count();

  // Submit
  await page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Enregistrer")').last().click();
  // Wait for modal to close and table to update
  await page.waitForTimeout(2500);
  await page.waitForLoadState("networkidle").catch(() => {});
  await ss(page, "after-create-fastship");

  const bodyAfter  = await page.locator("body").innerText();
  const hasFastShip = bodyAfter.includes("FastShip");
  const rowsAfter   = await page.locator("table tbody tr").count();
  const modalGone   = await page.locator('[role="dialog"][open], dialog[open]').count() === 0;

  if (hasFastShip && rowsAfter > rowsBefore) {
    pass("STEP3-create", `FastShip appears in table (${rowsBefore} → ${rowsAfter} rows), modal closed: ${modalGone}`);
  } else if (hasFastShip) {
    pass("STEP3-create", `FastShip visible in page (rows same: ${rowsAfter} — possible inline refresh)`);
  } else {
    fail("STEP3-create", `FastShip NOT in table after submit. Rows: ${rowsBefore}→${rowsAfter}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP 4 — Search "med"
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 4: Search filter ===");
  const searchInput = page.locator('input[placeholder*="Recherche" i], input[placeholder*="Search" i], input[type="search"]').first();
  const hasSearch = await searchInput.count() > 0;
  if (hasSearch) {
    await searchInput.fill("med");
    await page.waitForTimeout(800);
    await ss(page, "search-med");
    const afterSearch = await page.locator("body").innerText();
    const medVisible  = afterSearch.includes("Medina");
    const techVisible = afterSearch.includes("TechZone");
    const fastVisible = afterSearch.includes("FastShip");
    if (medVisible && !techVisible && !fastVisible) {
      pass("STEP4-search", `"med" → only Medina visible (TechZone=${techVisible} FastShip=${fastVisible})`);
    } else {
      fail("STEP4-search", `"med" filter wrong: Medina=${medVisible} TechZone=${techVisible} FastShip=${fastVisible}`);
    }
  } else {
    fail("STEP4-search", "Search input not found");
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP 5 — Clear search
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 5: Clear search ===");
  if (hasSearch) {
    await searchInput.fill("");
    await page.waitForTimeout(800);
    await ss(page, "search-cleared");
    const afterClear = await page.locator("body").innerText();
    const allBack = afterClear.includes("TechZone") && afterClear.includes("Medina") && afterClear.includes("FastShip");
    if (allBack) {
      pass("STEP5-clear", "All 3 expediteurs visible after clearing search");
    } else {
      fail("STEP5-clear", `TechZone=${afterClear.includes("TechZone")} Medina=${afterClear.includes("Medina")} FastShip=${afterClear.includes("FastShip")}`);
    }
  } else {
    fail("STEP5-clear", "Search input not found, skipped");
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP 6 — Status filter "Actifs"
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 6: Status filter Actifs ===");
  const selects = page.locator("select");
  const selectCount = await selects.count();
  if (selectCount > 0) {
    // find the status select
    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      const opts = await sel.locator("option").allInnerTexts();
      if (opts.some((o) => /actif/i.test(o))) {
        await sel.selectOption({ label: opts.find((o) => /actif/i.test(o)) });
        await page.waitForTimeout(800);
        break;
      }
    }
    await ss(page, "filter-actifs");
    const afterFilter = await page.locator("body").innerText();
    const allStillThere = afterFilter.includes("TechZone") && afterFilter.includes("Medina") && afterFilter.includes("FastShip");
    if (allStillThere) {
      pass("STEP6-filter", "Actifs filter: all 3 expediteurs still visible (all ACTIVE status)");
    } else {
      fail("STEP6-filter", `Some hidden: TechZone=${afterFilter.includes("TechZone")} Medina=${afterFilter.includes("Medina")} FastShip=${afterFilter.includes("FastShip")}`);
    }
  } else {
    // try combobox (custom select)
    const combobox = page.locator('[role="combobox"]').first();
    if (await combobox.count() > 0) {
      await combobox.click();
      const actifOpt = page.locator('[role="option"]').filter({ hasText: /actif/i }).first();
      if (await actifOpt.count() > 0) {
        await actifOpt.click();
        await page.waitForTimeout(800);
        await ss(page, "filter-actifs-combobox");
        const afterFilter = await page.locator("body").innerText();
        const allThere = afterFilter.includes("TechZone") && afterFilter.includes("Medina") && afterFilter.includes("FastShip");
        allThere
          ? pass("STEP6-filter", "Actifs filter (combobox): all 3 visible")
          : fail("STEP6-filter", "Actifs filter: some expediteurs hidden");
      } else {
        probe("STEP6-filter", "Combobox open but no 'Actif' option found");
        await page.keyboard.press("Escape");
        await ss(page, "filter-combobox-open");
      }
    } else {
      probe("STEP6-filter", "No select or combobox found for status filter");
      await ss(page, "filter-not-found");
    }
  }

  } // end if step1Passed

  // ──────────────────────────────────────────────────────────────────
  // STEP 7 — Expediteur self-login (separate context = fresh session)
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP 7: Expediteur self-login ===");
  const ctx2  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page2 = await ctx2.newPage();
  const expErrors = [];
  page2.on("console", (m) => { if (m.type() === "error") expErrors.push(m.text()); });
  page2.on("pageerror", (e) => expErrors.push("PAGEERROR: " + e.message));

  await page2.goto("http://localhost:5173/expediteur/login");
  await page2.waitForLoadState("networkidle");
  const ssExp = async (name) => {
    const fname = `exp-${name}.png`;
    await page2.screenshot({ path: path.join(SS_DIR, fname) });
    console.log(`  📸 ${fname}`);
  };
  await ssExp("login-page");

  await page2.locator('input[type="email"]').first().fill("tech@test.tn");
  await page2.locator('input[type="password"]').first().fill("TechZone2026");
  await page2.locator('button[type="submit"]').first().click();

  try {
    await page2.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
    await page2.waitForLoadState("networkidle");
    await page2.waitForSelector(".auth-bootstrap", { state: "detached", timeout: 5000 }).catch(() => {});
    await page2.waitForTimeout(500);
    await ssExp("after-login");
    const expUrl = page2.url();
    if (expUrl.includes("/expediteur") && !expUrl.includes("/login")) {
      pass("STEP7-login", `tech@test.tn logged in → ${expUrl}`);
    } else {
      fail("STEP7-login", `Wrong URL after login: ${expUrl}`);
    }
  } catch (e) {
    await ssExp("login-FAILED");
    fail("STEP7-login", "Timeout: " + e.message);
  }

  if (expErrors.length) {
    probe("STEP7-console", "Expediteur page errors: " + expErrors.slice(0, 3).join(" | "));
  }
  await ctx2.close();

  // ──────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  for (const r of RESULTS) {
    const icon = r.ok === true ? "✅" : r.ok === false ? "❌" : "🔍";
    console.log(`${icon}  ${r.id.padEnd(20)} ${r.detail}`);
  }

  if (consoleErrors.length) {
    console.log("\nBROWSER CONSOLE ERRORS (admin session):");
    consoleErrors.forEach((e) => console.log("  ⚠️", e));
  } else {
    console.log("\nBROWSER CONSOLE ERRORS: none");
  }
  if (consoleWarns.length) {
    console.log("\nBROWSER CONSOLE WARNINGS:");
    consoleWarns.forEach((w) => console.log("  ⚠️", w));
  }

  await browser.close();
  console.log("\n📁 Screenshots:", SS_DIR);
})();
