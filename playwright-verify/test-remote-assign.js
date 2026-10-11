/**
 * End-to-end test — Assignation à distance (admin + dispatcher)
 * Suit le checklist a → k fourni par l'utilisateur.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SS_DIR = path.join(__dirname, "screenshots-remote-assign");
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

const APP = "http://localhost:5173";

// Colis utilisés
const TRK_ASSIGN = "TRK-2026-00010";   // PENDING, Gabès, sans livreur → assigné pour de vrai
const CITY_ASSIGN = "Gabès";
const TRK_VALID = "TRK-2026-00009";    // AT_WAREHOUSE, Bizerte → sert aux tests de validation (non soumis)

/** Interroge la base directement (évite de brûler une tentative de login) */
function dbQuery(sql) {
  return execSync(
    `docker exec djunoeli-db psql -U djunoeli -d djunoeli -t -A -c "${sql}"`,
    { encoding: "utf8" }
  ).trim();
}

async function login(page, email, password, loginPath) {
  await page.goto(`${APP}${loginPath}`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
}

(async () => {
  console.log("\n=== PRÉREQUIS ===");
  const before = dbQuery(
    `SELECT status || '|' || COALESCE(\\"livreurId\\",'none') FROM \\"Shipment\\" WHERE \\"trackingNumber\\"='${TRK_ASSIGN}'`
  );
  console.log(`  ${TRK_ASSIGN} avant : ${before}`);
  if (!before.startsWith("PENDING")) {
    console.log(`  ⚠️  ${TRK_ASSIGN} n'est pas PENDING — le test reste valide mais l'état initial diffère`);
  }
  pass("PREREQ", `${TRK_ASSIGN} état initial = ${before}`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  // Compte les POST /remote-assign pour prouver l'absence d'appel quand désactivé
  let postCount = 0;
  const netFail = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/v1\/remote-assign$/.test(r.url())) postCount++;
  });
  page.on("response", (r) => {
    if (r.url().includes("/api/v1/remote-assign") && r.status() >= 500) {
      netFail.push(`${r.request().method()} ${r.url()} → ${r.status()}`);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // a — Login admin + page dédiée
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== a: login admin + /admin/remote-assign ===");
  await login(page, "admin@djunoeli.tn", "Djunoeli2026", "/admin/login");

  const navLink = page.locator('a[href="/admin/remote-assign"]').first();
  const navOk = (await navLink.count()) > 0;
  if (navOk) await navLink.click();
  else await page.goto(`${APP}/admin/remote-assign`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await ss(page, "a-page-admin");

  const bodyTxt = await page.locator("body").innerText();
  const hasExplain = (await page.locator(".ra-explain").count()) > 0;
  const hasCta = (await page.locator(".ra-cta-card").count()) > 0;
  const hasNouvelle = bodyTxt.includes("Nouvelle assignation");
  const hasCommencer = bodyTxt.includes("Commencer");
  if (navOk && hasExplain && hasCta && hasNouvelle && hasCommencer) {
    pass("a", `Sidebar OK · page avec explication + boutons "Nouvelle assignation" et "Commencer"`);
  } else {
    fail("a", `sidebar=${navOk} explain=${hasExplain} cta=${hasCta} nouvelle=${hasNouvelle} commencer=${hasCommencer}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // b — Ouverture de la modale à l'étape 1
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== b: clic Commencer → modale étape 1 ===");
  await page.locator(".ra-cta-card button").click();
  await page.waitForSelector(".ra-modal", { timeout: 8000 });
  await page.waitForTimeout(900);
  await ss(page, "b-modale-etape1");

  const searchVisible = (await page.locator(".ra-search input").count()) > 0;
  const step1On = await page.locator(".ra-step").first().evaluate((el) => el.className.includes("on"));
  const nShips = await page.locator(".ra-ship").count();
  if (searchVisible && step1On && nShips > 0) {
    pass("b", `Modale ouverte à l'étape 1 · champ de recherche présent · ${nShips} colis listés`);
  } else {
    fail("b", `recherche=${searchVisible} étape1=${step1On} colis=${nShips}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // c — Recherche + sélection du colis
  // ──────────────────────────────────────────────────────────────────
  console.log(`\n=== c: recherche "${CITY_ASSIGN}" → sélection ${TRK_ASSIGN} ===`);
  const nBefore = await page.locator(".ra-ship").count();
  await page.locator(".ra-search input").fill(CITY_ASSIGN);
  await page.waitForTimeout(1600); // laisse la requête filtrée revenir
  const nAfter = await page.locator(".ra-ship").count();
  await ss(page, "c-recherche-filtree");

  const filtered = nAfter < nBefore && nAfter > 0;
  const targetVisible = await page.locator(".ra-ship", { hasText: TRK_ASSIGN }).count();
  if (filtered && targetVisible > 0) {
    pass("c-filtre", `Liste filtrée par ville : ${nBefore} → ${nAfter} colis, ${TRK_ASSIGN} présent`);
  } else {
    fail("c-filtre", `avant=${nBefore} après=${nAfter} cible visible=${targetVisible}`);
  }

  await page.locator(".ra-ship", { hasText: TRK_ASSIGN }).first().click();
  await page.waitForTimeout(900);
  const step2Reached = (await page.locator(".ra-liv").count()) > 0;
  if (step2Reached) pass("c", `Clic sur ${TRK_ASSIGN} → passage à l'étape 2`);
  else fail("c", "Le clic sur le colis n'a pas mené à l'étape 2");

  // ──────────────────────────────────────────────────────────────────
  // d — Étape 2 : livreurs triés + bouton Changer
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== d: étape 2 — livreurs triés + bouton Changer ===");
  await ss(page, "d-etape2-livreurs");
  const statuses = await page.locator(".ra-liv-status").allInnerTexts();
  const rank = { "Disponible": 0, "Occupé": 1, "Hors ligne": 2 };
  const ranks = statuses.map((s) => rank[s.trim()] ?? 9);
  const sortedOk = ranks.every((v, i) => i === 0 || ranks[i - 1] <= v);
  // Le tri n'est démontré que si au moins 2 statuts DIFFÉRENTS sont présents
  const distinct = new Set(statuses.map((s) => s.trim())).size;
  if (statuses.length > 0 && sortedOk && distinct >= 2) {
    pass("d-tri", `${statuses.length} livreurs, ${distinct} statuts distincts, ordre dispo→occupé→hors ligne respecté : ${statuses.map(s => s.trim()).join(" < ")}`);
  } else if (sortedOk && distinct < 2) {
    fail("d-tri", `Tri non démontré : tous les livreurs ont le même statut (${statuses.map(s => s.trim()).join(", ")})`);
  } else {
    fail("d-tri", `statuts=[${statuses.join(", ")}] triés=${sortedOk}`);
  }

  // Bouton "Changer" → retour étape 1
  await page.locator(".ra-change").click();
  await page.waitForTimeout(700);
  const backToStep1 = (await page.locator(".ra-search input").count()) > 0;
  if (backToStep1) pass("d-changer", 'Le bouton "Changer" ramène bien à l\'étape 1');
  else fail("d-changer", '"Changer" n\'est pas revenu à l\'étape 1');

  // On re-sélectionne le colis puis un livreur
  await page.locator(".ra-search input").fill(CITY_ASSIGN);
  await page.waitForTimeout(1500);
  await page.locator(".ra-ship", { hasText: TRK_ASSIGN }).first().click();
  await page.waitForTimeout(900);

  const livName = (await page.locator(".ra-liv .ra-liv-info b").first().innerText()).trim();
  await page.locator(".ra-liv").first().click();
  await page.waitForTimeout(800);
  const step3Reached = (await page.locator(".ra-recap").count()) > 0;
  if (step3Reached) pass("d", `Clic sur "${livName}" → passage à l'étape 3`);
  else fail("d", "Le clic sur le livreur n'a pas mené à l'étape 3");

  // ──────────────────────────────────────────────────────────────────
  // e — Étape 3 : récap, activation progressive, soumission
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== e: étape 3 — récap + activation du bouton + assignation ===");
  await ss(page, "e1-etape3-recap-desactive");

  const recapTrk = (await page.locator(".ra-recap .mono-cell").first().innerText()).trim();
  const phoneHref = await page.locator(".ra-recap-phone").first().getAttribute("href").catch(() => null);
  const btn = page.locator(".ra-btn-confirm");

  const disabled0 = await btn.isDisabled();
  if (recapTrk === TRK_ASSIGN && phoneHref?.startsWith("tel:")) {
    pass("e-recap", `Récap : ${recapTrk} → ${livName} · téléphone cliquable (${phoneHref})`);
  } else {
    fail("e-recap", `trk="${recapTrk}" attendu "${TRK_ASSIGN}" · href tél="${phoneHref}"`);
  }
  if (disabled0) pass("e-disabled-0", "Bouton Assigner désactivé (raison vide + case non cochée)");
  else fail("e-disabled-0", "Bouton actif alors que raison vide et case non cochée");

  // Raison seule → toujours désactivé
  await page.locator(".ra-field textarea").fill("Récupéré directement chez l'expéditeur");
  await page.waitForTimeout(400);
  const disabled1 = await btn.isDisabled();
  if (disabled1) pass("e-disabled-1", "Raison saisie mais case non cochée → toujours désactivé");
  else fail("e-disabled-1", "Bouton actif alors que la case n'est pas cochée");
  await ss(page, "e2-raison-sans-case");

  // Case cochée → actif
  await page.locator(".ra-confirm input[type=checkbox]").check();
  await page.waitForTimeout(400);
  const enabled = await btn.isEnabled();
  if (enabled) pass("e-enabled", "Case cochée → le bouton Assigner s'ACTIVE");
  else fail("e-enabled", "Le bouton reste désactivé après avoir coché la case");
  await ss(page, "e3-bouton-actif");

  // Soumission
  await btn.click();
  await page.waitForTimeout(2500);
  const modalGone = (await page.locator(".ra-modal").count()) === 0;
  const bannerCount = await page.locator(".ra-page-banner").count();
  const bannerTxt = bannerCount ? (await page.locator(".ra-page-banner").innerText()).trim() : "";
  await ss(page, "e4-succes-banniere");

  if (modalGone && bannerCount > 0) {
    pass("e", `Assignation OK · modale fermée · bannière verte : "${bannerTxt}"`);
  } else {
    fail("e", `modaleFermée=${modalGone} bannière=${bannerCount} "${bannerTxt}"`);
  }

  // ──────────────────────────────────────────────────────────────────
  // f — Le colis est passé PICKED_UP
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== f: vérification en base — colis PICKED_UP ===");
  const after = dbQuery(
    `SELECT s.status || '|' || COALESCE(u.email,'none') FROM \\"Shipment\\" s LEFT JOIN \\"Livreur\\" l ON s.\\"livreurId\\"=l.id LEFT JOIN \\"User\\" u ON l.\\"userId\\"=u.id WHERE s.\\"trackingNumber\\"='${TRK_ASSIGN}'`
  );
  const [newStatus, newLivreur] = after.split("|");
  if (newStatus === "PICKED_UP" && newLivreur !== "none") {
    pass("f", `${TRK_ASSIGN} : ${before.split("|")[0]} → ${newStatus}, livreur = ${newLivreur}`);
  } else {
    fail("f", `état après assignation = ${after} (attendu PICKED_UP + livreur)`);
  }

  // ──────────────────────────────────────────────────────────────────
  // i — Validation : bouton désactivé, aucun appel API
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== i: validation — désactivé sans case / sans raison, aucun POST ===");
  const postsBefore = postCount;
  await page.locator(".ra-page-head button, .ds-btn-primary").first().click(); // "Nouvelle assignation"
  await page.waitForSelector(".ra-modal", { timeout: 8000 });
  await page.waitForTimeout(1000);
  await page.locator(".ra-search input").fill(TRK_VALID);
  await page.waitForTimeout(1600);
  await page.locator(".ra-ship", { hasText: TRK_VALID }).first().click();
  await page.waitForTimeout(800);
  await page.locator(".ra-liv").first().click();
  await page.waitForTimeout(800);

  const btn2 = page.locator(".ra-btn-confirm");
  // cas 1 : raison remplie, case NON cochée
  await page.locator(".ra-field textarea").fill("Test de validation");
  await page.waitForTimeout(300);
  const case1 = await btn2.isDisabled();
  await btn2.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);

  // cas 2 : case cochée, raison VIDE
  await page.locator(".ra-field textarea").fill("");
  await page.locator(".ra-confirm input[type=checkbox]").check();
  await page.waitForTimeout(300);
  const case2 = await btn2.isDisabled();
  await btn2.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  await ss(page, "i-validation-desactive");

  const noCall = postCount === postsBefore;
  if (case1 && case2 && noCall) {
    pass("i", `Sans case → désactivé · raison vide → désactivé · aucun POST /remote-assign déclenché`);
  } else {
    fail("i", `sansCase désactivé=${case1} raisonVide désactivé=${case2} POSTs=${postCount - postsBefore}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // j — Responsive 390px
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== j: responsive 390px (modale à l'étape 3) ===");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  await ss(page, "j-mobile-390");
  const resp = await page.evaluate(() => {
    const winW = window.innerWidth;
    const modal = document.querySelector(".ra-modal");
    if (!modal) return { ok: false, reason: "modale absente" };
    const mr = modal.getBoundingClientRect();
    const modalFits = mr.left >= -1 && mr.right <= winW + 1;

    // Le récap doit passer en vertical
    const rows = document.querySelectorAll(".ra-recap-row");
    let stacked = null;
    if (rows.length >= 2) {
      const a = rows[0].getBoundingClientRect();
      const b = rows[1].getBoundingClientRect();
      stacked = b.top >= a.bottom - 5;
    }
    // Débordement imputable à la modale
    const offenders = [];
    modal.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > winW + 1) {
        offenders.push(`${el.tagName.toLowerCase()}.${(typeof el.className === "string" ? el.className : "").slice(0, 30)}`);
      }
    });
    // Éléments interactifs toujours atteignables
    const confirmBtn = document.querySelector(".ra-btn-confirm");
    const cr = confirmBtn?.getBoundingClientRect();
    const btnUsable = !!cr && cr.width > 40 && cr.right <= winW + 1;

    return { ok: modalFits && stacked === true && offenders.length === 0 && btnUsable,
             modalFits, stacked, offenders: offenders.slice(0, 5), btnUsable, winW };
  });
  if (resp.ok) {
    pass("j", `Modale dans la largeur · récap empilé en vertical · bouton Assigner utilisable · 0 débordement`);
  } else {
    fail("j", `modaleTient=${resp.modalFits} récapVertical=${resp.stacked} boutonUtilisable=${resp.btnUsable} débordements=[${(resp.offenders || []).join(", ")}]`);
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(500);

  // Ferme la modale sans soumettre
  await page.locator(".ra-close").click().catch(() => {});
  await page.waitForTimeout(500);

  // ──────────────────────────────────────────────────────────────────
  // g — Bouton dans la liste des colis admin
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== g: bouton dans la liste des colis admin ===");
  await page.goto(`${APP}/admin/shipments`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  const raBtn = page.locator(".ds-page-head button", { hasText: "Assigner à distance" });
  const btnExists = (await raBtn.count()) > 0;
  await ss(page, "g-liste-colis-bouton");
  if (btnExists) {
    await raBtn.first().click();
    await page.waitForSelector(".ra-modal", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const opened = (await page.locator(".ra-modal").count()) > 0;
    await ss(page, "g-modale-depuis-liste");
    if (opened) pass("g", 'Bouton "Assigner à distance" présent dans le page-head → ouvre la modale');
    else fail("g", "Le bouton est présent mais la modale ne s'ouvre pas");
    await page.locator(".ra-close").click().catch(() => {});
  } else {
    fail("g", 'Bouton "Assigner à distance" introuvable dans le page-head de /admin/shipments');
  }

  // ──────────────────────────────────────────────────────────────────
  // h — Dispatcher
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== h: dispatcher /dispatch/remote-assign ===");
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page2 = await ctx2.newPage();
  const consoleErrors2 = [];
  page2.on("console", (m) => { if (m.type() === "error") consoleErrors2.push(m.text()); });
  page2.on("pageerror", (e) => consoleErrors2.push("PAGEERROR: " + e.message));

  await login(page2, "ali@djunoeli.tn", "Ali2026", "/dispatch/login");
  const navLink2 = page2.locator('a[href="/dispatch/remote-assign"]').first();
  const nav2Ok = (await navLink2.count()) > 0;
  if (nav2Ok) await navLink2.click();
  else await page2.goto(`${APP}/dispatch/remote-assign`);
  await page2.waitForLoadState("networkidle");
  await page2.waitForTimeout(900);
  await ss(page2, "h-page-dispatcher");

  const page2Ok = (await page2.locator(".ra-explain").count()) > 0 && (await page2.locator(".ra-cta-card").count()) > 0;
  // La modale doit s'ouvrir et charger les données (rôle DISPATCHER autorisé côté API)
  await page2.locator(".ra-cta-card button").click();
  await page2.waitForSelector(".ra-modal", { timeout: 8000 }).catch(() => {});
  await page2.waitForTimeout(1400);
  const modal2 = (await page2.locator(".ra-modal").count()) > 0;
  const ships2 = await page2.locator(".ra-ship").count();
  await ss(page2, "h-modale-dispatcher");
  if (nav2Ok && page2Ok && modal2 && ships2 > 0) {
    pass("h", `Sidebar + page dispatcher OK · modale ouverte · ${ships2} colis chargés (API autorise DISPATCHER)`);
  } else {
    fail("h", `sidebar=${nav2Ok} page=${page2Ok} modale=${modal2} colis=${ships2}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // k — Erreurs console
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== k: erreurs console ===");
  const all = [...consoleErrors, ...consoleErrors2];
  const real = all.filter((e) =>
    !/Failed to load resource/.test(e) && !/400 \(Bad Request\)/.test(e) && !/404 \(Not Found\)/.test(e)
  );
  if (real.length === 0 && netFail.length === 0) {
    pass("k-console", `Aucune erreur console applicative (${all.length} log(s) réseau filtrés), aucun 5xx`);
  } else {
    fail("k-console", `Erreurs: ${real.slice(0, 5).join(" | ")} ${netFail.join(" | ")}`);
  }

  await browser.close();

  console.log("\n\n=========== RÉCAP ===========");
  const okN = RESULTS.filter((r) => r.ok).length;
  const koN = RESULTS.filter((r) => !r.ok).length;
  for (const r of RESULTS) console.log(`${r.ok ? "✅" : "❌"} ${r.id.padEnd(14)} ${r.detail}`);
  console.log(`\n${okN} OK · ${koN} KO`);
  fs.writeFileSync(path.join(SS_DIR, "results.json"), JSON.stringify(RESULTS, null, 2));
  process.exit(koN > 0 ? 1 : 0);
})();
