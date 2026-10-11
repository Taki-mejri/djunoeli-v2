/**
 * End-to-end test — Page Vérification (4ème station dispatcher)
 * Suit le checklist a → l fourni par l'utilisateur.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SS_DIR = path.join(__dirname, "screenshots-inventory");
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

const API = "http://localhost:4001/api/v1";
const APP = "http://localhost:5173";

// Colis au dépôt (préparés en amont) + cas d'erreur
const TRK_A = "TRK-2026-00001";   // AT_WAREHOUSE
const TRK_B = "TRK-2026-00008";   // AT_WAREHOUSE
const TRK_MISSING = "TRK-2026-00009"; // AT_WAREHOUSE, volontairement NON scanné
const TRK_PENDING = "TRK-2026-00010"; // PENDING → pas au dépôt
const TRK_FAKE = "TRK-9999-XXXXX";    // introuvable

/** Lit le compteur "X/Y" de la carte de progression */
async function readCounter(page) {
  const txt = await page.locator(".inv-progress-count").first().innerText().catch(() => "");
  const m = txt.replace(/\s/g, "").match(/(\d+)\/(\d+)/);
  return m ? { verified: +m[1], expected: +m[2] } : null;
}

/** Scanne un tracking et attend le toast */
async function scan(page, trk) {
  const input = page.locator(".inv-scan input").first();
  await input.fill(trk);
  await input.press("Enter");
  // attend l'apparition d'un toast
  await page.waitForSelector(".inv-toast", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700); // laisse react-query refetch
  const toast = page.locator(".inv-toast").first();
  const cls = (await toast.getAttribute("class").catch(() => "")) || "";
  const msg = (await toast.innerText().catch(() => "")) || "";
  const kind = cls.includes("ok") ? "ok" : cls.includes("warn") ? "warn" : cls.includes("err") ? "err" : "?";
  return { kind, msg: msg.trim() };
}

/** Attend la disparition du toast pour ne pas polluer le test suivant */
async function waitToastGone(page) {
  await page.waitForSelector(".inv-toast", { state: "detached", timeout: 5000 }).catch(() => {});
}

(async () => {
  // ──────────────────────────────────────────────────────────────────
  // PRÉREQUIS — état initial via API
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== PRÉREQUIS: état du dépôt + aucune session ouverte ===");
  let token = null;
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ali@djunoeli.tn", password: "Ali2026" }),
    });
    const b = await r.json();
    token = b.accessToken;
    const H = { Authorization: `Bearer ${token}` };

    const exp = await (await fetch(`${API}/dispatch/inventory/expected`, { headers: H })).json();
    const cur = await (await fetch(`${API}/dispatch/inventory/current`, { headers: H })).json();

    if (cur.session) {
      // clôture une session résiduelle pour partir propre
      await fetch(`${API}/dispatch/inventory/${cur.session.id}/close`, {
        method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: "{}",
      });
      console.log("  ℹ️  session résiduelle clôturée");
    }
    if (exp.summary.expected >= 2) {
      pass("PREREQ", `${exp.summary.expected} colis AT_WAREHOUSE : ${exp.rows.map(r => r.trackingNumber).join(", ")}`);
    } else {
      fail("PREREQ", `Seulement ${exp.summary.expected} colis au dépôt (2 minimum requis)`);
    }
  } catch (e) {
    fail("PREREQ", "Échec préparation : " + e.message);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

  const netFail = [];
  page.on("response", (resp) => {
    if (resp.url().includes("/api/v1/dispatch/inventory") && resp.status() >= 500) {
      netFail.push(`${resp.request().method()} ${resp.url()} → ${resp.status()}`);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== LOGIN dispatcher (ali@djunoeli.tn) ===");
  await page.goto(`${APP}/dispatch/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').first().fill("ali@djunoeli.tn");
  await page.locator('input[type="password"]').first().fill("Ali2026");
  await page.locator('button[type="submit"]').first().click();
  try {
    await page.waitForURL((u) => !u.href.includes("/login"), { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    pass("LOGIN", `Connecté → ${page.url()}`);
  } catch (e) {
    await ss(page, "login-FAILED");
    fail("LOGIN", "Timeout: " + e.message);
    console.log(JSON.stringify(RESULTS, null, 2));
    process.exit(1);
  }

  // Vérifie l'entrée de nav "Vérification"
  const navTxt = await page.locator("body").innerText();
  if (navTxt.includes("Vérification")) pass("NAV", 'Entrée "Vérification" présente dans la sidebar');
  else fail("NAV", 'Entrée "Vérification" absente de la sidebar');

  // ──────────────────────────────────────────────────────────────────
  // a — /dispatch/verification : écran de démarrage
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== a: /dispatch/verification — écran de démarrage ===");
  // navigation via le lien de la sidebar (teste aussi le routing)
  const navLink = page.locator('a[href="/dispatch/verification"]').first();
  if (await navLink.count()) {
    await navLink.click();
  } else {
    await page.goto(`${APP}/dispatch/verification`);
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await ss(page, "a-ecran-demarrage");

  const startVisible = await page.locator(".inv-start").count();
  const startTxt = startVisible ? await page.locator(".inv-start").innerText() : "";
  const nbMatch = startTxt.match(/(\d+)\s*colis/);
  const btnStart = page.locator(".inv-btn-start");
  if (startVisible && (await btnStart.count()) > 0 && nbMatch) {
    pass("a", `Écran de démarrage : "${nbMatch[1]} colis au dépôt" + bouton "Ouvrir une session"`);
  } else {
    fail("a", `Écran de démarrage incomplet (inv-start=${startVisible}, texte="${startTxt.slice(0, 120)}")`);
  }
  const expectedAtStart = nbMatch ? +nbMatch[1] : 0;

  // ──────────────────────────────────────────────────────────────────
  // b — Ouvrir une session
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== b: Ouvrir une session d'inventaire ===");
  await btnStart.click();
  await page.waitForSelector(".inv-progress-card", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await ss(page, "b-session-ouverte");

  const c0 = await readCounter(page);
  const pctTxt = await page.locator(".inv-progress-pct").innerText().catch(() => "");
  const focused = await page.evaluate(() => document.activeElement?.closest(".inv-scan") !== null);
  const missCount0 = await page.locator(".inv-col").nth(1).locator(".inv-item.miss").count();
  const verCount0 = await page.locator(".inv-col").nth(0).locator(".inv-item.ok").count();

  const bOk = c0 && c0.verified === 0 && c0.expected === expectedAtStart
    && pctTxt.trim() === "0%" && verCount0 === 0 && missCount0 === expectedAtStart;
  if (bOk) {
    pass("b", `Progression 0/${c0.expected}, barre 0%, scan auto-focus=${focused}, Vérifiés vide, Manquants=${missCount0}`);
  } else {
    fail("b", `compteur=${JSON.stringify(c0)} pct="${pctTxt}" focus=${focused} vérifiés=${verCount0} manquants=${missCount0} (attendu 0/${expectedAtStart})`);
  }
  if (!focused) fail("b-focus", "Le champ de scan n'a PAS le focus automatique");
  else pass("b-focus", "Champ de scan auto-focus OK");

  await waitToastGone(page);

  // ──────────────────────────────────────────────────────────────────
  // c — Scan d'un tracking valide
  // ──────────────────────────────────────────────────────────────────
  console.log(`\n=== c: scan colis valide ${TRK_A} ===`);
  const rc = await scan(page, TRK_A);
  await ss(page, "c-scan-valide");
  const c1 = await readCounter(page);
  const inVerified1 = await page.locator(".inv-col").nth(0).locator(".inv-item.ok", { hasText: TRK_A }).count();
  const inMissing1 = await page.locator(".inv-col").nth(1).locator(".inv-item.miss", { hasText: TRK_A }).count();
  const pct1 = await page.locator(".inv-progress-pct").innerText().catch(() => "");

  if (rc.kind === "ok" && c1?.verified === 1 && inVerified1 === 1 && inMissing1 === 0) {
    pass("c", `Toast vert "${rc.msg}" · compteur ${c1.verified}/${c1.expected} · barre ${pct1} · ${TRK_A} passé Manquants→Vérifiés`);
  } else {
    fail("c", `toast=${rc.kind} "${rc.msg}" compteur=${JSON.stringify(c1)} enVérifiés=${inVerified1} enManquants=${inMissing1}`);
  }
  await waitToastGone(page);

  // ──────────────────────────────────────────────────────────────────
  // d — 2ème colis
  // ──────────────────────────────────────────────────────────────────
  console.log(`\n=== d: scan 2ème colis ${TRK_B} ===`);
  const rd = await scan(page, TRK_B);
  await ss(page, "d-scan-2eme");
  const c2 = await readCounter(page);
  const pct2 = await page.locator(".inv-progress-pct").innerText().catch(() => "");
  if (rd.kind === "ok" && c2?.verified === 2) {
    pass("d", `Toast vert · compteur ${c2.verified}/${c2.expected} · barre ${pct2}`);
  } else {
    fail("d", `toast=${rd.kind} "${rd.msg}" compteur=${JSON.stringify(c2)}`);
  }
  await waitToastGone(page);

  // ──────────────────────────────────────────────────────────────────
  // e — Re-scan du même colis
  // ──────────────────────────────────────────────────────────────────
  console.log(`\n=== e: re-scan de ${TRK_B} (déjà vérifié) ===`);
  const re = await scan(page, TRK_B);
  await ss(page, "e-deja-verifie");
  const c3 = await readCounter(page);
  if (re.kind === "warn" && /déjà/i.test(re.msg) && c3?.verified === 2) {
    pass("e", `Toast orange "${re.msg}" · compteur inchangé ${c3.verified}/${c3.expected}`);
  } else {
    fail("e", `toast=${re.kind} "${re.msg}" compteur=${JSON.stringify(c3)}`);
  }
  await waitToastGone(page);

  // ──────────────────────────────────────────────────────────────────
  // f — Colis pas au dépôt (PENDING)
  // ──────────────────────────────────────────────────────────────────
  console.log(`\n=== f: scan colis PENDING ${TRK_PENDING} ===`);
  const rf = await scan(page, TRK_PENDING);
  await ss(page, "f-pas-au-depot");
  const c4 = await readCounter(page);
  if (rf.kind === "warn" && /pas au dépôt/i.test(rf.msg) && c4?.verified === 2) {
    pass("f", `Toast orange "${rf.msg}" · compteur inchangé`);
  } else {
    fail("f", `toast=${rf.kind} "${rf.msg}" compteur=${JSON.stringify(c4)}`);
  }
  await waitToastGone(page);

  // ──────────────────────────────────────────────────────────────────
  // g — Tracking bidon
  // ──────────────────────────────────────────────────────────────────
  console.log(`\n=== g: scan tracking bidon ${TRK_FAKE} ===`);
  const rg = await scan(page, TRK_FAKE);
  await ss(page, "g-introuvable");
  const c5 = await readCounter(page);
  if (rg.kind === "err" && /introuvable/i.test(rg.msg) && c5?.verified === 2) {
    pass("g", `Toast rouge "${rg.msg}" · compteur inchangé`);
  } else {
    fail("g", `toast=${rg.kind} "${rg.msg}" compteur=${JSON.stringify(c5)}`);
  }
  await waitToastGone(page);

  // ──────────────────────────────────────────────────────────────────
  // h — Les 2 colonnes
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== h: colonnes Vérifiés / Manquants ===");
  await ss(page, "h-deux-colonnes");
  const colVerTitle = await page.locator(".inv-col-title.ok").innerText().catch(() => "");
  const colMissTitle = await page.locator(".inv-col-title.miss").innerText().catch(() => "");
  const verItems = await page.locator(".inv-col").nth(0).locator(".inv-item.ok b").allInnerTexts();
  const missItems = await page.locator(".inv-col").nth(1).locator(".inv-item.miss b").allInnerTexts();
  const verSet = verItems.map(s => s.trim());
  const missSet = missItems.map(s => s.trim());

  const hOk = verSet.includes(TRK_A) && verSet.includes(TRK_B)
    && !missSet.includes(TRK_A) && !missSet.includes(TRK_B)
    && missSet.includes(TRK_MISSING);
  if (hOk) {
    pass("h", `Vérifiés (${verSet.length}) : ${verSet.join(", ")} | Manquants (${missSet.length}) : ${missSet.join(", ")}`);
  } else {
    fail("h", `Vérifiés=[${verSet.join(", ")}] Manquants=[${missSet.join(", ")}] (attendu ${TRK_MISSING} en manquant)`);
  }
  console.log(`     titres: "${colVerTitle.trim()}" / "${colMissTitle.trim()}"`);

  // ──────────────────────────────────────────────────────────────────
  // k — Responsive mobile (avant clôture, tant que la page est riche)
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== k: responsive mobile 390px ===");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await ss(page, "k-mobile-390");
  const layout = await page.evaluate(() => {
    const winW = window.innerWidth;
    const cols = document.querySelectorAll(".inv-col");
    if (cols.length < 2) return { ok: false, reason: "colonnes introuvables" };
    const a = cols[0].getBoundingClientRect();
    const b = cols[1].getBoundingClientRect();
    const stacked = b.top >= a.bottom - 5;           // empilées verticalement

    // Débordement imputable À LA PAGE (sous .inv-wrap) vs au shell partagé
    const invOffenders = [];
    const shellOffenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > winW + 1) {
        const cls = (typeof el.className === "string" ? el.className : "").slice(0, 40);
        (el.closest(".inv-wrap") ? invOffenders : shellOffenders).push(`${el.tagName.toLowerCase()}.${cls}`);
      }
    });
    // Le contenu de la page tient-il dans la largeur ?
    const wrap = document.querySelector(".inv-wrap");
    const wrapFits = wrap ? wrap.getBoundingClientRect().right <= winW + 1 : false;

    return {
      ok: stacked && invOffenders.length === 0 && wrapFits,
      stacked, wrapFits, invOffenders, shellOffenders: shellOffenders.slice(0, 4),
      scrollW: document.documentElement.scrollWidth, winW,
    };
  });
  if (layout.ok) {
    pass("k", `Colonnes empilées verticalement · contenu de la page dans la largeur · 0 débordement imputable à .inv-wrap`);
    if (layout.shellOffenders.length) {
      console.log(`     ⚠️  débordement PRÉ-EXISTANT du layout partagé (hors périmètre) : ${layout.shellOffenders.join(", ")} → scrollW=${layout.scrollW}px`);
    }
  } else {
    fail("k", `stacked=${layout.stacked} wrapFits=${layout.wrapFits} débordementsPage=[${(layout.invOffenders || []).join(", ")}]`);
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(500);

  // ──────────────────────────────────────────────────────────────────
  // i — Clôture
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== i: clôturer l'inventaire ===");
  const closeBtn = page.locator(".inv-btn-close");
  const closeInfo = await page.locator(".inv-close-info").innerText().catch(() => "");
  await closeBtn.click();
  await page.waitForSelector(".inv-toast", { timeout: 8000 }).catch(() => {});
  const closeToast = (await page.locator(".inv-toast").first().innerText().catch(() => "")).trim();
  await ss(page, "i-cloture-toast");
  await page.waitForTimeout(1500);
  await ss(page, "i-retour-demarrage");

  const backToStart = (await page.locator(".inv-start").count()) > 0;
  const gone = (await page.locator(".inv-progress-card").count()) === 0;
  if (closeToast && backToStart && gone) {
    pass("i", `Toast "${closeToast}" · retour à l'écran de démarrage (info pré-clôture : "${closeInfo.trim()}")`);
  } else {
    fail("i", `toast="${closeToast}" écranDémarrage=${backToStart} carteProgressionRetirée=${gone}`);
  }

  // ──────────────────────────────────────────────────────────────────
  // j — Historique
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== j: historique des inventaires ===");
  await page.waitForTimeout(800);
  const histRows = page.locator(".inv-hist-row");
  const nHist = await histRows.count();
  let firstHist = "";
  if (nHist > 0) firstHist = (await histRows.first().innerText()).replace(/\s+/g, " ").trim();
  await page.locator(".inv-history").scrollIntoViewIfNeeded().catch(() => {});
  await ss(page, "j-historique");

  const hasAli = /Ali/.test(firstHist);
  const hasClosed = /Clôturé/i.test(firstHist);
  const hasStats = /\d+\/\d+\s*vérifiés/.test(firstHist);
  if (nHist > 0 && hasAli && hasClosed && hasStats) {
    pass("j", `Historique (${nHist} ligne(s)) — dernière : "${firstHist}"`);
  } else {
    fail("j", `nLignes=${nHist} Ali=${hasAli} Clôturé=${hasClosed} stats=${hasStats} → "${firstHist}"`);
  }

  // ──────────────────────────────────────────────────────────────────
  // l — Erreurs console
  // ──────────────────────────────────────────────────────────────────
  console.log("\n=== l: erreurs console / réseau ===");
  // Les 400/404 métier (déjà vérifié, pas au dépôt, introuvable) génèrent des
  // logs axios attendus → on ne retient que ce qui n'est pas lié à ces cas.
  const realErrors = consoleErrors.filter((e) =>
    !/Failed to load resource/.test(e) &&
    !/400 \(Bad Request\)/.test(e) &&
    !/404 \(Not Found\)/.test(e)
  );
  if (realErrors.length === 0 && netFail.length === 0) {
    pass("l-console", `Aucune erreur console applicative (${consoleErrors.length} log(s) réseau attendus filtrés), aucun 5xx`);
  } else {
    fail("l-console", `Erreurs: ${realErrors.slice(0, 5).join(" | ")} ${netFail.join(" | ")}`);
  }

  await browser.close();

  // ──────────────────────────────────────────────────────────────────
  console.log("\n\n=========== RÉCAP ===========");
  const okN = RESULTS.filter(r => r.ok === true).length;
  const koN = RESULTS.filter(r => r.ok === false).length;
  for (const r of RESULTS) console.log(`${r.ok ? "✅" : "❌"} ${r.id.padEnd(12)} ${r.detail}`);
  console.log(`\n${okN} OK · ${koN} KO`);
  fs.writeFileSync(path.join(SS_DIR, "results.json"), JSON.stringify(RESULTS, null, 2));
  process.exit(koN > 0 ? 1 : 0);
})();
