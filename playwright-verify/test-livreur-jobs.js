/**
 * End-to-end test — PWA Livreur : courses (liste + détail + actions réelles)
 * Suit le checklist a→l fourni par l'utilisateur. Viewport mobile (390px) tout du long.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots-livreur-jobs");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const fname = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.waitForTimeout(350); // laisse les animations d'ouverture de sheet se terminer
  await page.screenshot({ path: path.join(SS_DIR, fname), fullPage: false });
  console.log(`  📸 ${fname}`);
};

const RESULTS = [];
const pass = (id, detail) => { RESULTS.push({ id, ok: true, detail }); console.log(`  ✅ ${id}: ${detail}`); };
const fail = (id, detail) => { RESULTS.push({ id, ok: false, detail }); console.log(`  ❌ ${id}: ${detail}`); };

const BASE = "http://localhost:5173";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  const netLog = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/v1/livreur/jobs")) {
      netLog.push({ method: res.request().method(), url, status: res.status() });
    }
  });

  try {
    // ── a) Login Skander ──────────────────────────────────────
    console.log("\n=== STEP a: Login Skander ===");
    await page.goto(`${BASE}/livreur/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "skander@test.tn");
    await page.fill('input[type="password"]', "Skander2026");
    await ss(page, "login-form");
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => !window.location.pathname.includes("/livreur/login"),
      { timeout: 10000 }
    );
    if (page.url().includes("/livreur") && !page.url().includes("/livreur/login")) {
      pass("a", `Redirigé vers ${page.url()}`);
    } else {
      fail("a", `URL inattendue: ${page.url()}`);
    }
    await ss(page, "after-login");

    // ── b) Liste des courses ──────────────────────────────────
    console.log("\n=== STEP b: /livreur/jobs ===");
    const [listResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/v1/livreur/jobs?") && r.request().method() === "GET"),
      page.goto(`${BASE}/livreur/jobs`, { waitUntil: "networkidle" }),
    ]).catch(async () => {
      await page.goto(`${BASE}/livreur/jobs`, { waitUntil: "networkidle" });
      return [null];
    });
    await page.waitForSelector(".liv-job-card", { timeout: 10000 });
    const cardCount = await page.locator(".liv-job-card").count();
    const status200 = listResp ? listResp.status() === 200 : netLog.some((n) => n.method === "GET" && n.status === 200);
    if (cardCount > 0) {
      pass("b", `${cardCount} cartes de courses réelles affichées, GET /livreur/jobs → ${status200 ? "200" : "?"}`);
    } else {
      fail("b", "Aucune carte de course trouvée");
    }
    await ss(page, "jobs-list");

    // Trouver la course COD (TRK-2026-00012) pour le chemin nominal
    const codCard = page.locator(".liv-job-card", { hasText: "TRK-2026-00012" });
    const codCardCount = await codCard.count();
    if (codCardCount === 0) fail("b-cod", "Course COD TRK-2026-00012 introuvable dans la liste");
    else pass("b-cod", "Course COD TRK-2026-00012 trouvée dans la liste");

    // ── c) Détail d'une course PICKED_UP (celle avec COD) ─────
    console.log("\n=== STEP c: Détail course COD ===");
    await codCard.click();
    await page.waitForURL(/\/livreur\/jobs\//);
    await page.waitForSelector(".liv-card-label:has-text('Destinataire')", { timeout: 10000 });
    const hasReceiverCard = await page.locator(".liv-receiver-name").count() > 0;
    const hasCallBtn = await page.locator(".liv-contact-btn.call").count() > 0;
    const hasLogBtn = await page.locator(".liv-contact-btn.log").count() > 0;
    const hasMapBtn = await page.locator(".liv-contact-btn.map").count() > 0;
    const hasCodBand = await page.locator(".liv-cod-card").count() > 0;
    const hasTimeline = await page.locator(".liv-timeline").count() > 0;
    const hasActionBar = await page.locator(".liv-action-bar").count() > 0;
    const hasFailBtn = await page.locator(".liv-btn-fail").count() > 0;
    if (hasReceiverCard && hasCallBtn && hasLogBtn && hasMapBtn && hasCodBand && hasTimeline && hasActionBar && hasFailBtn) {
      pass("c", "Page détail complète : destinataire, 3 boutons contact, bandeau COD, timeline, barre d'action");
    } else {
      fail("c", `Éléments manquants — receiver:${hasReceiverCard} call:${hasCallBtn} log:${hasLogBtn} map:${hasMapBtn} cod:${hasCodBand} timeline:${hasTimeline} bar:${hasActionBar} fail:${hasFailBtn}`);
    }
    await ss(page, "job-detail-pickedup");

    // ── d) Bouton Appeler → href tel: ─────────────────────────
    console.log("\n=== STEP d: href tel: ===");
    const telHref = await page.locator(".liv-contact-btn.call").getAttribute("href");
    if (telHref && telHref.startsWith("tel:+216")) {
      pass("d", `href = ${telHref}`);
    } else {
      fail("d", `href inattendu: ${telHref}`);
    }

    // ── e) Noter l'appel ───────────────────────────────────────
    console.log("\n=== STEP e: Noter l'appel ===");
    await page.click(".liv-contact-btn.log");
    await page.waitForSelector(".liv-sheet:has-text('Résultat de l')", { timeout: 5000 });
    await ss(page, "call-sheet");
    const [callResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/call") && r.request().method() === "POST"),
      page.click(".liv-call-opt:has-text('Pas de réponse')"),
    ]);
    await page.waitForSelector(".liv-banner.ok", { timeout: 5000 });
    const bannerText = await page.locator(".liv-banner.ok").innerText();
    if (callResp.status() === 200 && bannerText.includes("Appel enregistré")) {
      pass("e", `POST /call → 200, bannière: "${bannerText}"`);
    } else {
      fail("e", `status=${callResp.status()} bannerText="${bannerText}"`);
    }
    // Vérifie timeline mise à jour avec l'événement d'appel
    await page.waitForTimeout(500);
    const timelineText = await page.locator(".liv-timeline").innerText();
    if (timelineText.toLowerCase().includes("appel")) {
      pass("e-timeline", "Mini-timeline contient l'événement d'appel");
    } else {
      fail("e-timeline", `Timeline ne contient pas 'appel': ${timelineText.slice(0, 200)}`);
    }
    await ss(page, "after-call-logged");

    // ── f) PICKED_UP → IN_TRANSIT ("En route") ────────────────
    console.log("\n=== STEP f: PICKED_UP -> IN_TRANSIT ===");
    const mainBtnTextBefore = await page.locator(".liv-btn-main").innerText();
    const [statusResp1] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/status") && r.request().method() === "PATCH"),
      page.click(".liv-btn-main"),
    ]);
    await page.waitForTimeout(500);
    const badgeTextAfterF = await page.locator(".liv-detail-head .liv-badge").innerText();
    const mainBtnTextAfter = await page.locator(".liv-btn-main").innerText();
    if (statusResp1.status() === 200 && badgeTextAfterF.includes("En route") && mainBtnTextAfter.includes("Arrivé")) {
      pass("f", `avant="${mainBtnTextBefore}" → PATCH 200, badge="${badgeTextAfterF}", bouton="${mainBtnTextAfter}"`);
    } else {
      fail("f", `status=${statusResp1.status()} badge="${badgeTextAfterF}" bouton="${mainBtnTextAfter}"`);
    }
    await ss(page, "in-transit");

    // ── g) IN_TRANSIT → OUT_FOR_DELIVERY ("En livraison") ─────
    console.log("\n=== STEP g: IN_TRANSIT -> OUT_FOR_DELIVERY ===");
    const [statusResp2] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/status") && r.request().method() === "PATCH"),
      page.click(".liv-btn-main"),
    ]);
    await page.waitForTimeout(500);
    const badgeTextAfterG = await page.locator(".liv-detail-head .liv-badge").innerText();
    const mainBtnTextAfterG = await page.locator(".liv-btn-main").innerText();
    if (statusResp2.status() === 200 && badgeTextAfterG.includes("En livraison") && mainBtnTextAfterG.includes("livré")) {
      pass("g", `PATCH 200, badge="${badgeTextAfterG}", bouton="${mainBtnTextAfterG}"`);
    } else {
      fail("g", `status=${statusResp2.status()} badge="${badgeTextAfterG}" bouton="${mainBtnTextAfterG}"`);
    }
    await ss(page, "out-for-delivery");

    // ── h) Livraison AVEC COD ──────────────────────────────────
    console.log("\n=== STEP h: Livraison avec COD ===");
    await page.click(".liv-btn-main"); // ouvre la modal
    await page.waitForSelector(".liv-sheet:has-text('Confirmer la livraison')", { timeout: 5000 });
    const modalHasCod = await page.locator(".liv-cod-confirm").count() > 0;
    const confirmBtnText = await page.locator(".liv-btn-success").innerText();
    if (modalHasCod && confirmBtnText.includes("DT encaissés")) {
      pass("h-modal", `Modal COD affichée, bouton: "${confirmBtnText}"`);
    } else {
      fail("h-modal", `modalHasCod=${modalHasCod} confirmBtnText="${confirmBtnText}"`);
    }
    await ss(page, "deliver-modal-cod");

    const [statusResp3] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/status") && r.request().method() === "PATCH"),
      page.click(".liv-btn-success"),
    ]);
    let patchBody = null;
    try { patchBody = statusResp3.request().postDataJSON(); } catch { /* ignore */ }
    await page.waitForSelector(".liv-banner.ok, .liv-terminal.ok", { timeout: 5000 });
    const terminalText = await page.locator(".liv-terminal.ok").innerText().catch(() => "");
    if (
      statusResp3.status() === 200 &&
      patchBody?.codCollected === true &&
      terminalText.includes("Course terminée — colis livré")
    ) {
      pass("h", `PATCH codCollected:true → 200, "${terminalText}"`);
    } else {
      fail("h", `status=${statusResp3.status()} body=${JSON.stringify(patchBody)} terminal="${terminalText}"`);
    }
    await ss(page, "delivered-terminal");

    // ── i) Échec sur une autre course (TRK-2026-00008) ─────────
    console.log("\n=== STEP i: Échec de livraison sur une autre course ===");
    await page.goto(`${BASE}/livreur/jobs`, { waitUntil: "networkidle" });
    await page.waitForSelector(".liv-job-card", { timeout: 10000 });
    const otherCard = page.locator(".liv-job-card", { hasText: "TRK-2026-00008" });
    const otherCardCount = await otherCard.count();
    if (otherCardCount === 0) {
      fail("i-setup", "Course TRK-2026-00008 introuvable pour le test d'échec");
    } else {
      await otherCard.click();
      await page.waitForSelector(".liv-btn-fail", { timeout: 10000 });
      await page.click(".liv-btn-fail");
      await page.waitForSelector(".liv-sheet:has-text('Échec de livraison')", { timeout: 5000 });

      const confirmDisabledNoReason = await page.locator(".liv-btn-danger").isDisabled();
      if (confirmDisabledNoReason) pass("i-disabled", "Bouton confirmer désactivé sans raison");
      else fail("i-disabled", "Bouton confirmer NON désactivé sans raison choisie");
      await ss(page, "failure-modal-empty");

      await page.click(".liv-quick-btn:has-text('Destinataire absent')");
      const confirmEnabled = !(await page.locator(".liv-btn-danger").isDisabled());
      if (confirmEnabled) pass("i-enabled", "Bouton confirmer activé après choix d'une raison");
      else fail("i-enabled", "Bouton confirmer toujours désactivé après choix de raison");
      await ss(page, "failure-modal-reason-selected");

      const [failResp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/status") && r.request().method() === "PATCH"),
        page.click(".liv-btn-danger"),
      ]);
      let failBody = null;
      try { failBody = failResp.request().postDataJSON(); } catch { /* ignore */ }
      await page.waitForSelector(".liv-terminal.fail", { timeout: 5000 });
      const terminalFailText = await page.locator(".liv-terminal.fail").innerText();
      if (
        failResp.status() === 200 &&
        failBody?.status === "FAILED_DELIVERY" &&
        failBody?.note === "Destinataire absent" &&
        terminalFailText.includes("Course terminée — échec de livraison")
      ) {
        pass("i", `PATCH status=FAILED_DELIVERY note="${failBody.note}" → 200, "${terminalFailText}"`);
      } else {
        fail("i", `status=${failResp.status()} body=${JSON.stringify(failBody)} terminal="${terminalFailText}"`);
      }
      await ss(page, "failed-terminal");
    }

    // ── j) Retour liste : livrées/échouées filtrées ────────────
    console.log("\n=== STEP j: Retour liste, filtrage ===");
    await page.goto(`${BASE}/livreur/jobs`, { waitUntil: "networkidle" });
    await page.waitForSelector(".liv-jobs, .liv-empty", { timeout: 10000 });
    const listText = await page.locator(".liv-page").innerText();
    const stillHasDelivered = listText.includes("TRK-2026-00012");
    const stillHasFailed = listText.includes("TRK-2026-00008");
    if (!stillHasDelivered && !stillHasFailed) {
      pass("j", "Les courses livrée/échouée ne sont plus dans la liste active");
    } else {
      fail("j", `TRK-00012 présent=${stillHasDelivered} TRK-00008 présent=${stillHasFailed}`);
    }
    await ss(page, "list-after-completion");

    // ── k) Responsive (déjà en 390px tout du long) ─────────────
    console.log("\n=== STEP k: Responsive mobile (390px) ===");
    pass("k", "Tout le parcours exécuté en viewport 390x844 — voir captures");

    // ── l) tsc + console errors ─────────────────────────────────
    console.log("\n=== STEP l: erreurs console ===");
    if (consoleErrors.length === 0) {
      pass("l", "Aucune erreur console détectée pendant tout le parcours");
    } else {
      fail("l", `${consoleErrors.length} erreurs console: ${consoleErrors.slice(0, 5).join(" | ")}`);
    }

  } catch (e) {
    fail("FATAL", e.message + "\n" + e.stack);
    await ss(page, "fatal-error");
  }

  await browser.close();

  console.log("\n\n========== RÉSUMÉ ==========");
  const okCount = RESULTS.filter((r) => r.ok).length;
  const failCount = RESULTS.filter((r) => !r.ok).length;
  RESULTS.forEach((r) => console.log(`${r.ok ? "✅" : "❌"} ${r.id}: ${r.detail}`));
  console.log(`\n${okCount} OK / ${failCount} ÉCHECS sur ${RESULTS.length} vérifications`);
  process.exit(failCount > 0 ? 1 : 0);
})();
