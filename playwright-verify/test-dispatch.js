/**
 * End-to-end test — Dispatch dashboard (4ème espace)
 * Suit le checklist a→j fourni par l'utilisateur.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots-dispatch");
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
const probe = (id, detail) => { RESULTS.push({ id, ok: null, detail }); console.log(`  🔍 ${id}: ${detail}`); };

const API = "http://localhost:4000/api/v1";

(async () => {
  // ──────────────────────────────────────────────────────────────────
  // STEP c — Prépare un colis PENDING via tech@test.tn (API directe)
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP c: création colis test PENDING (tech@test.tn) ===");
  let trackingNumber = null;
  try {
    const loginRes = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "tech@test.tn", password: "TechZone2026" }),
    });
    const loginBody = await loginRes.json();
    if (!loginRes.ok) throw new Error(`login ${loginRes.status}: ${JSON.stringify(loginBody)}`);
    const token = loginBody.accessToken;

    const shipRes = await fetch(`${API}/expediteur/shipments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        receiverName: "Test Dispatch QA",
        receiverPhone: "+216 20 000 000",
        deliveryAddress: "Rue de test 12",
        deliveryCity: "Sousse",
        deliveryType: "STANDARD",
        isFragile: false,
        codAmount: 0,
        description: "Colis créé automatiquement pour le test du dashboard dispatcher",
      }),
    });
    const shipBody = await shipRes.json();
    if (!shipRes.ok) throw new Error(`create shipment ${shipRes.status}: ${JSON.stringify(shipBody)}`);
    trackingNumber = shipBody.trackingNumber ?? shipBody.shipment?.trackingNumber;
    pass("STEPc", `Colis créé : ${trackingNumber} (PENDING, destination Sousse)`);
  } catch (e) {
    fail("STEPc", "Échec création colis test : " + e.message);
  }

  if (!trackingNumber) {
    console.log("\n❌ Impossible de continuer sans colis test. Arrêt.");
    console.log(JSON.stringify(RESULTS, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  const netLog = [];
  page.on("response", async (resp) => {
    if (resp.url().includes("/api/v1/dispatch/")) {
      netLog.push(`${resp.request().method()} ${resp.url().replace(API, "")} → ${resp.status()}`);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP a — Login dispatcher
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP a: /dispatch/login + connexion ali@djunoeli.tn ===");
  await page.goto("http://localhost:5173/dispatch/login");
  await page.waitForLoadState("networkidle");
  await ss(page, "dispatch-login-page");

  const loginPageOk = (await page.locator('input[type="email"]').count()) > 0;
  if (loginPageOk) pass("STEPa-page", "Page de login dispatch affichée");
  else fail("STEPa-page", "Champ email introuvable sur /dispatch/login");

  await page.locator('input[type="email"]').first().fill("ali@djunoeli.tn");
  await page.locator('input[type="password"]').first().fill("Ali2026");
  await page.locator('button[type="submit"]').first().click();

  try {
    await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForSelector(".auth-bootstrap", { state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await ss(page, "dispatch-after-login");
    const url = page.url();
    if (url.includes("/dispatch") && !url.includes("/login")) {
      pass("STEPa-redirect", `Connecté → redirigé vers ${url}`);
    } else {
      fail("STEPa-redirect", `Mauvaise URL après login: ${url}`);
    }
  } catch (e) {
    await ss(page, "dispatch-login-FAILED");
    fail("STEPa-redirect", "Timeout redirection: " + e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP b — Dashboard accueil
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP b: Dashboard accueil ===");
  await page.waitForTimeout(800);
  const bodyText = await page.locator("body").innerText();

  const navLabels = ["Tableau de bord", "Réception", "Tri par gouvernorat", "Assignation livreurs", "Historique scans"];
  const missingNav = navLabels.filter((l) => !bodyText.includes(l));
  if (missingNav.length === 0) pass("STEPb-nav", "Sidebar affiche les 5 libellés attendus");
  else fail("STEPb-nav", "Libellés manquants dans la sidebar : " + missingNav.join(", "));

  const statCount = await page.locator(".dsp-stat").count();
  if (statCount === 4) pass("STEPb-stats", "4 stats cards affichées");
  else fail("STEPb-stats", `${statCount} stats cards trouvées (attendu 4)`);

  const stationCount = await page.locator(".dsp-station-card").count();
  if (stationCount === 3) pass("STEPb-stations", "3 cartes de station cliquables");
  else fail("STEPb-stations", `${stationCount} cartes de station trouvées (attendu 3)`);

  const hasAliFooter = bodyText.includes("Ali Ben Salah") || bodyText.includes("Ali");
  const hasRoleLabel = bodyText.includes("Opérateur dépôt");
  if (hasAliFooter && hasRoleLabel) pass("STEPb-footer", "Bas de sidebar : Ali Ben Salah / Opérateur dépôt");
  else fail("STEPb-footer", `Nom trouvé=${hasAliFooter} RoleLabel trouvé=${hasRoleLabel}`);

  await ss(page, "dispatch-home");

  // ──────────────────────────────────────────────────────────────────
  // STEP d — Réception : scan du colis test
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP d: Réception — scan " + trackingNumber + " ===");
  await page.locator('a[href="/dispatch/reception"]').first().click();
  await page.waitForURL("**/dispatch/reception", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  const scanInput = page.locator(".dsp-scan-input");
  const isFocused1 = await scanInput.evaluate((el) => el === document.activeElement).catch(() => false);
  if (isFocused1) pass("STEPd-autofocus", "Champ de scan auto-focus au chargement de la page");
  else fail("STEPd-autofocus", "Champ de scan n'a pas le focus automatiquement");

  await scanInput.fill(trackingNumber);
  await ss(page, "reception-filled");
  await scanInput.press("Enter");
  await page.waitForTimeout(1200);
  await ss(page, "reception-after-scan");

  const fbSuccess = page.locator(".dsp-feedback-success");
  const fbText = (await fbSuccess.count()) > 0 ? await fbSuccess.innerText() : null;
  if (fbText && /enregistré au dépôt/i.test(fbText)) {
    pass("STEPd-toast", `Toast vert : "${fbText.replace(/\n/g, " ")}"`);
  } else {
    fail("STEPd-toast", `Toast succès non trouvé ou texte inattendu: ${fbText}`);
  }

  const recentBodyD = await page.locator("body").innerText();
  const inRecentList = recentBodyD.includes(trackingNumber) && recentBodyD.includes("RÉCEPTIONNÉS DANS CETTE SESSION");
  if (inRecentList) pass("STEPd-recentlist", "Colis apparaît dans la liste 'réceptionnés dans cette session'");
  else fail("STEPd-recentlist", "Colis absent de la liste des scans récents");

  const inputEmptied = (await scanInput.inputValue()) === "";
  const refocused = await scanInput.evaluate((el) => el === document.activeElement).catch(() => false);
  if (inputEmptied && refocused) pass("STEPd-refocus", "Champ vidé et refocus après scan (scan en rafale)");
  else fail("STEPd-refocus", `Vidé=${inputEmptied} Refocus=${refocused}`);

  const receiveCall = netLog.find((l) => l.includes("scan/receive"));
  if (receiveCall && receiveCall.includes("200")) pass("STEPd-network", receiveCall);
  else fail("STEPd-network", "Pas de POST /dispatch/scan/receive → 200 observé: " + (receiveCall ?? "aucun"));

  // ──────────────────────────────────────────────────────────────────
  // STEP e — Re-scan même colis → 409
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP e: Re-scan même colis (attendu 409) ===");
  await scanInput.fill(trackingNumber);
  await scanInput.press("Enter");
  await page.waitForTimeout(1200);
  await ss(page, "reception-rescan-409");

  const fbError = page.locator(".dsp-feedback-error");
  const fbErrText = (await fbError.count()) > 0 ? await fbError.innerText() : null;
  const rescanCall = netLog.filter((l) => l.includes("scan/receive")).pop();
  if (fbErrText && /(déjà|already)/i.test(fbErrText) && rescanCall?.includes("409")) {
    pass("STEPe-conflict", `Toast rouge "${fbErrText.replace(/\n/g, " ")}" + réseau ${rescanCall}`);
  } else {
    fail("STEPe-conflict", `Toast="${fbErrText}" réseau="${rescanCall}"`);
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP f — Tri par gouvernorat
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP f: Tri par gouvernorat ===");
  await page.locator('a[href="/dispatch/tri"]').first().click();
  await page.waitForURL("**/dispatch/tri", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);

  const triInput = page.locator(".dsp-scan-input");
  const triDisabledBefore = await triInput.isDisabled();
  if (triDisabledBefore) pass("STEPf-disabled", "Champ de scan désactivé tant qu'aucun gouvernorat choisi");
  else fail("STEPf-disabled", "Champ de scan n'était PAS désactivé avant sélection du gouvernorat");

  await page.locator(".tbl-select").selectOption({ label: "Sousse" });
  await page.waitForTimeout(300);
  const triDisabledAfter = await triInput.isDisabled();
  const bodyAfterSousse = await page.locator("body").innerText();
  const hasBandeauSousse = /Bac actif\s*:\s*Sousse/.test(bodyAfterSousse);
  if (!triDisabledAfter && hasBandeauSousse) pass("STEPf-activated", "Champ activé + bandeau 'Bac actif : Sousse'");
  else fail("STEPf-activated", `Désactivé=${triDisabledAfter} BandeauOk=${hasBandeauSousse}`);

  await triInput.fill(trackingNumber);
  await triInput.press("Enter");
  await page.waitForTimeout(1200);
  await ss(page, "tri-sousse-match");

  const fbSortSuccess = page.locator(".dsp-feedback-success");
  const fbSortText = (await fbSortSuccess.count()) > 0 ? await fbSortSuccess.innerText() : null;
  if (fbSortText && /trié vers Sousse/i.test(fbSortText)) {
    pass("STEPf-match", `Toast vert "${fbSortText.replace(/\n/g, " ")}"`);
  } else {
    fail("STEPf-match", `Toast attendu non trouvé: ${fbSortText}`);
  }

  await page.locator(".tbl-select").selectOption({ label: "Sfax" });
  await page.waitForTimeout(300);
  await triInput.fill(trackingNumber);
  await triInput.press("Enter");
  await page.waitForTimeout(1200);
  await ss(page, "tri-sfax-mismatch");

  const fbWarn = page.locator(".dsp-feedback-warn");
  const fbWarnText = (await fbWarn.count()) > 0 ? await fbWarn.innerText() : null;
  if (fbWarnText && /trié vers Sfax/i.test(fbWarnText)) {
    pass("STEPf-mismatch", `Toast ORANGE (warn) "${fbWarnText.replace(/\n/g, " ")}"`);
  } else {
    fail("STEPf-mismatch", `Toast warn attendu non trouvé: ${fbWarnText}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP g — Assignation aux livreurs
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP g: Assignation livreurs ===");
  await page.locator('a[href="/dispatch/assignation"]').first().click();
  await page.waitForURL("**/dispatch/assignation", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ss(page, "assignation-list");

  const cardCount = await page.locator(".dsp-livreur-card").count();
  const offlineCards = page.locator(".dsp-livreur-card.offline");
  const offlineCount = await offlineCards.count();
  probe("STEPg-cards", `${cardCount} carte(s) livreur affichée(s), ${offlineCount} hors ligne`);

  const assignInput = page.locator(".dsp-scan-input");
  const assignDisabledBefore = await assignInput.isDisabled();
  if (assignDisabledBefore) pass("STEPg-disabled", "Champ de scan désactivé tant qu'aucun livreur choisi");
  else fail("STEPg-disabled", "Champ de scan n'était PAS désactivé avant sélection du livreur");

  const skanderCard = page.locator(".dsp-livreur-card", { hasText: "Skander" }).first();
  const skanderIsOffline = (await skanderCard.getAttribute("class"))?.includes("offline");
  await skanderCard.click();
  await page.waitForTimeout(300);
  const bodyAfterSkander = await page.locator("body").innerText();
  const hasBandeauSkander = /Livreur actif\s*:\s*Skander/.test(bodyAfterSkander);
  if (hasBandeauSkander) pass("STEPg-select", `Bandeau bleu 'Livreur actif : Skander...' affiché (offline avant clic=${skanderIsOffline})`);
  else fail("STEPg-select", "Bandeau 'Livreur actif' non affiché après sélection de Skander");

  await assignInput.fill(trackingNumber);
  await assignInput.press("Enter");
  await page.waitForTimeout(1200);
  await ss(page, "assignation-after-scan");

  const fbAssign = page.locator(".dsp-feedback-success");
  const fbAssignText = (await fbAssign.count()) > 0 ? await fbAssign.innerText() : null;
  if (fbAssignText && /remis à Skander/i.test(fbAssignText)) {
    pass("STEPg-toast", `Toast vert "${fbAssignText.replace(/\n/g, " ")}"`);
  } else {
    fail("STEPg-toast", `Toast attendu non trouvé: ${fbAssignText}`);
  }

  const assignCall = netLog.find((l) => l.includes("scan/assign"));
  if (assignCall && assignCall.includes("200")) pass("STEPg-network", assignCall);
  else fail("STEPg-network", "Pas de POST /dispatch/scan/assign → 200 observé: " + (assignCall ?? "aucun"));

  // ──────────────────────────────────────────────────────────────────
  // STEP h — Historique
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP h: Historique des scans ===");
  await page.locator('a[href="/dispatch/historique"]').first().click();
  await page.waitForURL("**/dispatch/historique", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ss(page, "historique-all");

  const histRowsAll = await page.locator(".dsp-hist-row").count();
  if (histRowsAll >= 3) pass("STEPh-list", `${histRowsAll} lignes d'historique affichées (recv+sort x2+assign)`);
  else fail("STEPh-list", `Seulement ${histRowsAll} lignes trouvées`);

  await page.locator(".dsp-tab", { hasText: "Réceptions" }).click();
  await page.waitForTimeout(800);
  await ss(page, "historique-receptions-only");
  const histBodyRecv = await page.locator("body").innerText();
  const histRowsRecv = await page.locator(".dsp-hist-row").count();
  const onlyReceptions = !histBodyRecv.includes("Trié") && !histBodyRecv.includes("Remis à");
  if (onlyReceptions && histRowsRecv >= 1) {
    pass("STEPh-filter", `Filtre 'Réceptions' : ${histRowsRecv} ligne(s), aucune ligne Tri/Assignation visible`);
  } else {
    fail("STEPh-filter", `Filtre incorrect : lignes=${histRowsRecv} contientTri=${histBodyRecv.includes("Trié")} contientAssign=${histBodyRecv.includes("Remis à")}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // STEP i — Sécurité : non-dispatcher ne peut pas accéder à /dispatch
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== STEP i: Sécurité — admin ne peut pas accéder à /dispatch ===");
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();
  await page2.goto("http://localhost:5173/admin/login");
  await page2.waitForLoadState("networkidle");
  await page2.locator('input[type="email"]').first().fill("admin@djunoeli.tn");
  await page2.locator('input[type="password"]').first().fill("Djunoeli2026");
  await page2.locator('button[type="submit"]').first().click();
  await page2.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 }).catch(() => {});
  await page2.waitForLoadState("networkidle");
  await page2.waitForTimeout(500);

  await page2.goto("http://localhost:5173/dispatch");
  await page2.waitForLoadState("networkidle");
  await page2.waitForTimeout(800);
  await ss(page2, "admin-tries-dispatch");
  const urlAfterAdminTry = page2.url();
  if (urlAfterAdminTry.includes("/dispatch/login") || urlAfterAdminTry === "http://localhost:5173/") {
    pass("STEPi-security", `Admin redirigé loin de /dispatch → ${urlAfterAdminTry}`);
  } else {
    fail("STEPi-security", `Admin a pu rester sur ${urlAfterAdminTry} — FAILLE`);
  }
  await ctx2.close();

  // ──────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  console.log("SUMMARY");
  console.log("═".repeat(70));
  for (const r of RESULTS) {
    const icon = r.ok === true ? "✅" : r.ok === false ? "❌" : "🔍";
    console.log(`${icon}  ${r.id.padEnd(20)} ${r.detail}`);
  }
  console.log("\nNETWORK LOG (dispatch):");
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
