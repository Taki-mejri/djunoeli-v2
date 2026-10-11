/**
 * Étape 4/6 — Vérification i18n de l'espace Dispatcher (FR / DE)
 *
 * Couvre a) → l) :
 *   a) login dispatcher + prérequis
 *   b) FR : dashboard, stations, sidebar
 *   c) bascule Deutsch (sidebar + stats accueil)
 *   d) Réception en DE (scan OK + re-scan "bereits im Lager erfasst")
 *   e) Tri en DE (bac Sousse non traduit, scan OK + mismatch)
 *   f) Assignation en DE (livreur + scan → "an ... übergeben")
 *   g) Vérification en DE (démarrage, session, colonnes, clôture)
 *   h) Assignation à distance en DE (page + modale 3 étapes)
 *   i) rebascule FR (toasts inclus)
 *   j) gouvernorats non traduits
 *   k) 390px lisible en DE
 *   l) aucun missingKey / aucun texte FR résiduel
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const API = process.env.API_URL || "http://localhost:4001/api/v1";
const SS_DIR = path.join(__dirname, "screenshots-dispatch-i18n");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssIdx = 0;
const ss = async (page, name) => {
  ssIdx++;
  const f = `${String(ssIdx).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, f), fullPage: false });
  console.log(`  📸 ${f}`);
};

const RESULTS = [];
const pass = (id, d) => { RESULTS.push({ id, ok: true, d }); console.log(`  ✅ ${id}: ${d}`); };
const fail = (id, d) => { RESULTS.push({ id, ok: false, d }); console.log(`  ❌ ${id}: ${d}`); };

const GOV = ["Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte", "Béja", "Jendouba",
  "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili"];

async function switchLang(page, code) {
  await page.click(".ds-topbar .lang-btn");
  await page.click(`.lang-menu .lang-item:has-text("${code === "de" ? "Deutsch" : "Français"}")`);
  await page.waitForTimeout(500);
}

async function goto(page, href) {
  await page.click(`.ds-nav a[href="${href}"]`);
  await page.waitForTimeout(1400);
}

/** Scanne un tracking dans la station courante et renvoie le texte du feedback */
async function scan(page, tracking) {
  await page.fill(".dsp-scan-input", tracking);
  await page.press(".dsp-scan-input", "Enter");
  await page.waitForTimeout(1600);
  return (await page.textContent(".dsp-feedback")).replace(/\s+/g, " ").trim();
}

/**
 * Attend l'apparition d'un NOUVEAU toast d'inventaire.
 * Les toasts s'auto-effacent au bout de 2,6 s : se contenter d'attendre la
 * présence de .inv-toast renverrait le toast PRÉCÉDENT encore affiché.
 */
async function waitToast(page, previous) {
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector(".inv-toast");
      return !!el && el.textContent.trim() !== "" && el.textContent.trim() !== prev;
    },
    previous ?? "",
    { timeout: 10000 }
  ).catch(() => {});
  return (await page.textContent(".inv-toast").catch(() => "") || "").trim();
}

/**
 * Prépare l'état de départ et CHOISIT LES COLIS DE TEST À L'EXÉCUTION.
 *
 * Les scans mutent la base : un test qui code en dur des numéros de suivi ne
 * passe qu'une seule fois. On sélectionne donc les colis d'après leur statut
 * courant, ce qui rend la suite rejouable autant de fois que voulu.
 *
 * Une seule connexion API (le limiteur backend autorise 5 logins / 15 min / IP).
 */
const TOKEN_CACHE = path.join(__dirname, ".dispatch-token.json");
const STATE_FILE = path.join(__dirname, ".dispatch-state.json");

/**
 * Jeton API mis en cache sur disque.
 * Le backend limite les connexions a 5 par 15 min et par IP : rejouer la suite
 * plusieurs fois de suite epuiserait le quota. On reutilise donc le jeton tant
 * qu'il est valide, et on ne se reconnecte que lorsqu'il expire.
 */
async function apiToken() {
  try {
    const c = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8"));
    // marge de 2 min avant expiration
    if (c.token && c.exp * 1000 - Date.now() > 120000) return c.token;
  } catch { /* pas de cache exploitable */ }

  const login = await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ali@djunoeli.tn", password: "Ali2026" }),
  }).then((r) => r.json());
  if (!login.accessToken) throw new Error("login API dispatcher impossible : " + JSON.stringify(login));
  const exp = JSON.parse(Buffer.from(login.accessToken.split(".")[1], "base64").toString()).exp;
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token: login.accessToken, exp }));
  return login.accessToken;
}

async function prepare() {
  const token = await apiToken();
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Session d'inventaire éventuellement restée ouverte → on repart propre
  const cur = await fetch(`${API}/dispatch/inventory/current`, { headers: h }).then((r) => r.json());
  if (cur?.session?.id) {
    await fetch(`${API}/dispatch/inventory/${cur.session.id}/close`, { method: "POST", headers: h, body: "{}" });
    console.log("  ℹ️  session d'inventaire préexistante clôturée");
  }

  const all = await fetch(`${API}/remote-assign/shipments`, { headers: h }).then((r) => r.json());

  // À réceptionner : un colis pas encore au dépôt (PENDING / AWAITING_PICKUP)
  const toReceive = all.find((s) => ["PENDING", "AWAITING_PICKUP"].includes(s.status));
  if (!toReceive) throw new Error("prérequis manquant : aucun colis PENDING/AWAITING_PICKUP à réceptionner");

  // Bac de tri = destination réelle du colis reçu → le tri correspondra
  const bin = toReceive.deliveryCity;

  // Mismatch : un colis déjà au dépôt dont la destination diffère du bac
  const mismatch = all.find((s) => s.status === "AT_WAREHOUSE" && s.deliveryCity !== bin);
  if (!mismatch) throw new Error("prérequis manquant : aucun colis AT_WAREHOUSE avec une autre destination que " + bin);

  // À vérifier en inventaire : n'importe quel colis au dépôt
  const atWarehouse = all.find((s) => s.status === "AT_WAREHOUSE");

  const fx = {
    receive: toReceive.trackingNumber,
    bin,
    mismatch: mismatch.trackingNumber,
    mismatchCity: mismatch.deliveryCity,
    verify: atWarehouse.trackingNumber,
  };
  console.log(`  ℹ️  fixtures : réception=${fx.receive} bac=${fx.bin} · mismatch=${fx.mismatch} (${fx.mismatchCity}) · inventaire=${fx.verify}`);
  return fx;
}

(async () => {
  const FX = await prepare();

  const browser = await chromium.launch({ headless: true });
  // Reutilise la session precedente si elle existe (cookie de refresh) : evite
  // un login par execution et menage le limiteur du backend.
  const ctx = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    ...(fs.existsSync(STATE_FILE) ? { storageState: STATE_FILE } : {}),
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const missingKeys = [];
  const httpFails = [];
  page.on("console", (m) => {
    const txt = m.text();
    if (/missingKey|i18next::translator/i.test(txt)) missingKeys.push(txt);
    else if (m.type() === "error") consoleErrors.push(txt);
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) httpFails.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });

  try {
    // ============ a) LOGIN ============
    console.log("\n─── a) Login dispatcher ───");
    await page.goto(`${BASE}/dispatch`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("i18nextLng", "fr"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);

    let reused = true;
    if (page.url().includes("/login")) {
      // Session absente ou expiree : connexion classique
      reused = false;
      await page.fill('input[type="email"]', "ali@djunoeli.tn");
      await page.fill('input[type="password"]', "Ali2026");
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => u.pathname.startsWith("/dispatch") && !u.pathname.includes("login"), { timeout: 20000 });
      await page.waitForTimeout(1800);
    }
    await ctx.storageState({ path: STATE_FILE });
    pass("a", `connecté en tant que dispatcher → ${new URL(page.url()).pathname}${reused ? " (session réutilisée)" : " (login)"}`);

    // ============ b) EN FRANÇAIS ============
    console.log("\n─── b) Espace en français ───");
    let body = await page.textContent("body");
    const frHome = ["Tableau de bord", "Reçus aujourd'hui", "Triés aujourd'hui", "Remis aux livreurs",
      "Colis au dépôt (total)", "Stations de scan", "Réception", "Tri par gouvernorat", "Assignation livreurs", "Ouvrir"];
    const frMiss = frHome.filter((s) => !body.includes(s));
    frMiss.length === 0
      ? pass("b1", "dashboard FR OK (stats + 3 cartes stations)")
      : fail("b1", "manquant en FR : " + frMiss.join(", "));

    const navFR = await page.textContent(".ds-nav");
    ["Principal", "Stations de scan", "Suivi", "Tableau de bord", "Réception", "Tri par gouvernorat",
      "Assignation livreurs", "Vérification", "Assignation à distance", "Historique scans"].every((s) => navFR.includes(s))
      ? pass("b2", "sidebar en français (3 groupes + 6 entrées)")
      : fail("b2", "sidebar FR incomplète : " + navFR.replace(/\s+/g, " "));
    // Rôle dans le topbar
    (await page.textContent(".ds-user-role")).includes("Opérateur dépôt")
      ? pass("b3", 'rôle topbar FR = "Opérateur dépôt"')
      : fail("b3", "rôle topbar FR inattendu");
    await ss(page, "home-fr");

    // ============ c) BASCULE DEUTSCH ============
    console.log("\n─── c) Bascule Deutsch ───");
    await switchLang(page, "de");
    const navDE = await page.textContent(".ds-nav");
    const navDEExpected = ["Hauptbereich", "Scan-Stationen", "Verfolgung", "Übersicht", "Wareneingang",
      "Sortierung nach Gouvernement", "Zuweisung an Fahrer", "Überprüfung", "Ferndispatch", "Scan-Verlauf"];
    const navDEMiss = navDEExpected.filter((s) => !navDE.includes(s));
    navDEMiss.length === 0
      ? pass("c1", "sidebar traduite : Wareneingang · Sortierung · Überprüfung · Zuweisung · Ferndispatch")
      : fail("c1", "sidebar DE incomplète, manquant : " + navDEMiss.join(", "));

    body = await page.textContent("body");
    const homeDE = ["Übersicht", "Heute empfangen", "Heute sortiert", "An Fahrer übergeben",
      "Sendungen im Lager (gesamt)", "Scan-Stationen", "Öffnen", "Aktivität des Tages"];
    const homeDEMiss = homeDE.filter((s) => !body.includes(s));
    homeDEMiss.length === 0
      ? pass("c2", "stats accueil traduites (Im Lager / Heute empfangen …)")
      : fail("c2", "accueil DE incomplet : " + homeDEMiss.join(", "));

    const frLeft = ["Tableau de bord", "Réceptionnés aujourd'hui", "Stations de scan", "Historique scans", "Opérateur dépôt"]
      .filter((s) => body.includes(s));
    frLeft.length === 0
      ? pass("c3", "aucun libellé FR résiduel sur l'accueil + sidebar")
      : fail("c3", "FR resté en dur : " + frLeft.join(", "));
    (await page.textContent(".ds-user-role")).includes("Lagermitarbeiter")
      ? pass("c4", 'rôle topbar traduit = "Lagermitarbeiter"')
      : fail("c4", "rôle topbar non traduit");
    await ss(page, "home-de");

    // ============ d) RÉCEPTION EN DE ============
    console.log("\n─── d) Réception en allemand ───");
    await goto(page, "/dispatch/reception");
    body = await page.textContent("body");
    ["Wareneingang", "Erfassen Sie die Sendungen", "Sendungsnummer scannen oder eingeben", "Tipp:"].every((s) => body.includes(s))
      ? pass("d1", "station Réception traduite")
      : fail("d1", "station Réception DE incomplète");

    const TRK = FX.receive;
    const fb1 = await scan(page, TRK);
    fb1.includes(`Sendung ${TRK} im Lager erfasst`)
      ? pass("d2", `scan OK en DE : "${fb1.slice(0, 70)}"`)
      : fail("d2", `feedback inattendu : "${fb1}"`);

    const fb2 = await scan(page, TRK);
    fb2.includes(`Sendung ${TRK} bereits im Lager erfasst`)
      ? pass("d3", `re-scan → message DE (erreur serveur FR remappée en clé) : "${fb2.slice(0, 70)}"`)
      : fail("d3", `re-scan : feedback non traduit → "${fb2}"`);

    // Liste de session + badge traduits
    const recent = await page.textContent(".dsp-recent-list").catch(() => "");
    const recentTitle = await page.textContent(".dsp-recent-title").catch(() => "");
    recentTitle.includes("IN DIESER SITZUNG EMPFANGEN") && recent.includes("gescannt")
      ? pass("d4", "liste de session traduite (titre + badge « gescannt »)")
      : fail("d4", `session : titre="${recentTitle}" badge dans "${recent.slice(0, 60)}"`);
    // Gouvernorat intact
    recent.includes(FX.bin)
      ? pass("j1", `gouvernorat "${FX.bin}" non traduit dans la liste de réception`)
      : fail("j1", `${FX.bin} absent de la liste`);
    await ss(page, "reception-de");

    // ============ e) TRI EN DE ============
    console.log("\n─── e) Tri en allemand ───");
    await goto(page, "/dispatch/tri");
    body = await page.textContent("body");
    ["Sortierung nach Gouvernement", "Sortierfach — Zielgouvernement", "Gouvernement auswählen"].every((s) => body.includes(s))
      ? pass("e1", "station Tri traduite")
      : fail("e1", "station Tri DE incomplète");

    // Les 24 gouvernorats du select ne sont pas traduits
    const opts = (await page.$$eval(".dsp-selector select option", (els) => els.map((e) => e.textContent.trim()))).slice(1);
    const badOpts = opts.filter((o) => !GOV.includes(o));
    badOpts.length === 0 && opts.length === 24
      ? pass("j2", `les 24 gouvernorats du bac de tri non traduits (${opts.slice(0, 4).join(", ")}…)`)
      : fail("j2", `select gouvernorats : ${opts.length} options, inattendues : ${badOpts.join(", ")}`);

    await page.selectOption(".dsp-selector select", FX.bin);
    await page.waitForTimeout(500);
    const activeBin = (await page.textContent(".dsp-active-bin")).replace(/\s+/g, " ").trim();
    activeBin.includes(`Aktives Fach: ${FX.bin}`) && activeBin.includes("alle Scans landen in diesem Fach")
      ? pass("e2", `bac actif en DE, gouvernorat intact : "${activeBin}"`)
      : fail("e2", `bac actif inattendu : "${activeBin}"`);

    const fb3 = await scan(page, TRK);
    fb3.includes(`Sendung ${TRK} nach ${FX.bin} sortiert`) && fb3.includes("Sortierung OK")
      ? pass("e3", `tri OK en DE : "${fb3.slice(0, 75)}"`)
      : fail("e3", `tri : feedback inattendu → "${fb3}"`);

    // Mismatch : colis Bizerte trié dans le bac Sousse
    const fb4 = await scan(page, FX.mismatch);
    fb4.includes(`nach ${FX.bin} sortiert`) && fb4.includes(`tatsächliches Ziel = ${FX.mismatchCity}`)
      ? pass("e4", `mismatch en DE, gouvernorats intacts : "${fb4.slice(0, 90)}"`)
      : fail("e4", `mismatch : feedback inattendu → "${fb4}"`);
    await ss(page, "tri-de");

    // ============ f) ASSIGNATION EN DE ============
    console.log("\n─── f) Assignation en allemand ───");
    await goto(page, "/dispatch/assignation");
    body = await page.textContent("body");
    ["Zuweisung an Fahrer", "Fahrer, der die Sendungen übernimmt"].every((s) => body.includes(s))
      ? pass("f1", "station Assignation traduite")
      : fail("f1", "station Assignation DE incomplète");

    // Statuts livreurs + véhicules + compteur de courses traduits
    const cardsTxt = await page.textContent(".dsp-livreur-grid");
    // Comparaison sur des MOTS ENTIERS : "Motorrad" (DE) commence par "Moto" (FR),
    // un includes() — ou une regex \p{L} mal échappée — produirait un faux positif.
    const words = new Set(cardsTxt.split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean));
    const frLivLeft = ["disponible", "occupé", "hors", "ligne", "Moto", "Voiture", "Camionnette", "course", "courses"]
      .filter((w) => words.has(w));
    frLivLeft.length === 0
      ? pass("f2", "cartes livreurs traduites (statut, véhicule, compteur)")
      : fail("f2", "FR résiduel sur les cartes livreurs : " + frLivLeft.join(", "));

    await page.click('.dsp-livreur-card:has-text("Skander")');
    await page.waitForTimeout(500);
    const activeLiv = (await page.textContent(".dsp-active-bin")).replace(/\s+/g, " ").trim();
    activeLiv.includes("Aktiver Fahrer: Skander")
      ? pass("f3", `livreur actif en DE : "${activeLiv.slice(0, 70)}"`)
      : fail("f3", `livreur actif inattendu : "${activeLiv}"`);

    const fb5 = await scan(page, TRK);
    fb5.includes("an Skander Trabelsi übergeben") && fb5.includes("Gute Fahrt")
      ? pass("f4", `assignation OK en DE : "${fb5.slice(0, 80)}"`)
      : fail("f4", `assignation : feedback inattendu → "${fb5}"`);
    await ss(page, "assignation-de");

    // ============ g) VÉRIFICATION EN DE ============
    console.log("\n─── g) Vérification (inventaire) en allemand ───");
    await goto(page, "/dispatch/verification");
    body = await page.textContent("body");
    const startTxt = (await page.textContent(".inv-start")).replace(/\s+/g, " ").trim();
    body.includes("Bestandsüberprüfung") && startTxt.includes("Inventur starten") &&
      /\d+ Sendungen sind derzeit im Lager/.test(startTxt) && startTxt.includes("Inventursitzung öffnen")
      ? pass("g1", `écran de démarrage en DE avec {{count}} : "${startTxt.slice(0, 95)}"`)
      : fail("g1", `écran démarrage inattendu : "${startTxt}"`);
    await ss(page, "verification-start-de");

    await page.click(".inv-btn-start");
    const toast1 = await waitToast(page, null);
    toast1.includes("Inventursitzung geöffnet")
      ? pass("g2", `toast d'ouverture traduit : "${toast1}"`)
      : fail("g2", `toast ouverture non traduit : "${toast1}"`);

    body = await page.textContent("body");
    ["Sendungen überprüft", "Überprüft", "Fehlend", "Inventur abschließen", "Überprüfen"].every((s) => body.includes(s))
      ? pass("g3", "session ouverte : colonnes Überprüft / Fehlend + boutons en DE")
      : fail("g3", "session DE incomplète");

    // Vérifier un colis au dépôt
    await page.fill(".inv-scan input", FX.verify);
    await page.press(".inv-scan input", "Enter");
    const toast2 = await waitToast(page, toast1);
    toast2.includes("Sendung überprüft")
      ? pass("g4", `scan de vérification traduit : "${toast2}"`)
      : fail("g4", `toast vérification : "${toast2}"`);

    const closeInfo = (await page.textContent(".inv-close-info")).replace(/\s+/g, " ").trim();
    /nicht überprüfte Sendung\(en\) werden als fehlend markiert|Alle Sendungen sind überprüft/.test(closeInfo)
      ? pass("g5", `bandeau de clôture en DE : "${closeInfo}"`)
      : fail("g5", `bandeau clôture inattendu : "${closeInfo}"`);
    await ss(page, "verification-session-de");

    await page.click(".inv-btn-close");
    const toast3 = await waitToast(page, toast2);
    toast3.includes("Inventur abgeschlossen")
      ? pass("g6", `clôture : toast traduit (message serveur FR ignoré) : "${toast3}"`)
      : fail("g6", `toast clôture : "${toast3}"`);

    const hist = await page.textContent(".inv-history").catch(() => "");
    hist.includes("Abgeschlossen") && /überprüft/.test(hist)
      ? pass("g7", "historique des inventaires traduit (badge + stats)")
      : fail("g7", "historique inventaire non traduit : " + hist.replace(/\s+/g, " ").slice(0, 100));
    await ss(page, "verification-close-de");

    // ============ h) ASSIGNATION À DISTANCE EN DE ============
    console.log("\n─── h) Assignation à distance en allemand ───");
    await goto(page, "/dispatch/remote-assign");
    body = await page.textContent("body");
    const raDE = ["Ferndispatch", "Neue Zuweisung", "Wann diese Funktion nutzen?",
      "Jede nicht zugestellte Sendung kann zugewiesen werden", "Bereit, eine Sendung zuzuweisen?", "Starten"];
    const raMiss = raDE.filter((s) => !body.includes(s));
    raMiss.length === 0
      ? pass("h1", "page Ferndispatch traduite (explications + bullets + CTA)")
      : fail("h1", "page DE incomplète : " + raMiss.join(" | "));
    await ss(page, "remote-page-de");

    await page.click('button:has-text("Neue Zuweisung")');
    await page.waitForTimeout(1500);
    const steps = (await page.textContent(".ra-steps")).replace(/\s+/g, " ").trim();
    steps.includes("1 · Sendung") && steps.includes("2 · Fahrer") && steps.includes("3 · Bestätigen")
      ? pass("h2", `stepper 3 étapes en DE : "${steps}"`)
      : fail("h2", `stepper inattendu : "${steps}"`);

    // C'est un placeholder : absent du textContent, il faut lire l'attribut
    const searchPh = await page.getAttribute(".ra-search input", "placeholder");
    searchPh.includes("Nach Tracking, Empfänger oder Stadt suchen")
      ? pass("h3", `étape 1 : placeholder de recherche traduit ("${searchPh.slice(0, 45)}…")`)
      : fail("h3", "placeholder étape 1 non traduit : " + searchPh);
    // Statuts des colis traduits dans la liste
    const shipBadges = [...new Set(await page.$$eval(".ra-ship-badge", (els) => els.map((e) => e.textContent.trim())))];
    const frShip = shipBadges.filter((b) => ["En attente", "À ramasser", "Au dépôt", "Ramassé", "En route", "En livraison", "Échec"].includes(b));
    frShip.length === 0 && shipBadges.length > 0
      ? pass("h4", "statuts des colis traduits : " + shipBadges.join(", "))
      : fail("h4", "statuts FR dans la liste : " + frShip.join(", "));
    await ss(page, "remote-step1-de");

    await page.click(".ra-ship");
    await page.waitForTimeout(1200);
    const modal2 = (await page.textContent(".ra-modal")).replace(/\s+/g, " ");
    modal2.includes("Ändern") && modal2.includes("Zurück zur Sendung")
      ? pass("h5", "étape 2 (choix livreur) traduite : Ändern · Zurück zur Sendung")
      : fail("h5", "étape 2 non traduite");
    const livStatus = [...new Set(await page.$$eval(".ra-liv-status", (els) => els.map((e) => e.textContent.trim())))];
    livStatus.every((s) => ["Verfügbar", "Beschäftigt", "Offline"].includes(s))
      ? pass("h6", "statuts livreurs traduits : " + livStatus.join(", "))
      : fail("h6", "statuts livreurs FR : " + livStatus.join(", "));

    await page.click(".ra-liv");
    await page.waitForTimeout(1000);
    const modal3 = (await page.textContent(".ra-modal")).replace(/\s+/g, " ");
    const step3DE = ["Grund der Ferndispatch-Zuweisung", "Ich habe den Fahrer angerufen",
      "Diese Aktion setzt die Sendung auf", "zuweisen"];
    const s3Miss = step3DE.filter((s) => !modal3.includes(s));
    s3Miss.length === 0
      ? pass("h7", "étape 3 : case à cocher + raison + bouton en DE")
      : fail("h7", "étape 3 DE incomplète : " + s3Miss.join(" | "));
    const placeholder = await page.getAttribute(".ra-field textarea", "placeholder");
    placeholder.includes("direkt beim Versender abgeholt")
      ? pass("h8", "placeholder de la raison traduit")
      : fail("h8", "placeholder non traduit : " + placeholder);
    await ss(page, "remote-step3-de");
    await page.click(".ra-close");
    await page.waitForTimeout(500);

    // ============ i) REBASCULE FR ============
    console.log("\n─── i) Rebascule en français ───");
    await goto(page, "/dispatch/reception");
    await scan(page, TRK); // provoque un feedback en DE
    const fbDE = (await page.textContent(".dsp-feedback")).replace(/\s+/g, " ").trim();
    await switchLang(page, "fr");
    const fbFR = (await page.textContent(".dsp-feedback")).replace(/\s+/g, " ").trim();
    // Selon l'etat du colis, le scan reussit ou signale "deja au depot" : on
    // verifie la RE-TRADUCTION du toast, pas l'issue precise du scan.
    const deOK = /Sendung .*im Lager erfasst/.test(fbDE);
    const frOK = /Colis .*enregistré au dépôt/.test(fbFR);
    deOK && frOK && fbDE !== fbFR
      ? pass("i1", `le MÊME toast se re-traduit : DE "${fbDE.slice(0, 42)}…" → FR "${fbFR.slice(0, 42)}…"`)
      : fail("i1", `toast non re-traduit : DE="${fbDE}" FR="${fbFR}"`);

    body = await page.textContent("body");
    body.includes("Réception des colis") && !body.includes("Wareneingang")
      ? pass("i2", "station Réception revenue en français")
      : fail("i2", "retour FR incomplet sur la Réception");
    const navBack = await page.textContent(".ds-nav");
    navBack.includes("Tri par gouvernorat") && !navBack.includes("Sortierung")
      ? pass("i3", "sidebar revenue en français")
      : fail("i3", "sidebar non revenue en FR");
    await ss(page, "reception-retour-fr");

    // ============ j) GOUVERNORATS — historique des scans ============
    console.log("\n─── j) Gouvernorats non traduits ───");
    await switchLang(page, "de");
    await goto(page, "/dispatch/historique");
    body = await page.textContent("body");
    ["Scan-Verlauf", "Alle", "Wareneingänge", "Sortierungen", "Zuweisungen"].every((s) => body.includes(s))
      ? pass("j3", "historique des scans traduit (titre + 4 onglets)")
      : fail("j3", "historique DE incomplet");
    const histCities = await page.$$eval(".dsp-hist-sub span:first-child", (els) => els.map((e) => e.textContent.trim()));
    const cityBad = histCities.map((s) => s.split("·").pop().trim()).filter((c) => c && !GOV.includes(c));
    cityBad.length === 0
      ? pass("j4", `gouvernorats intacts dans l'historique (${[...new Set(histCities.map((s) => s.split("·").pop().trim()))].slice(0, 5).join(", ")})`)
      : fail("j4", "villes altérées : " + cityBad.join(", "));
    await ss(page, "historique-de");

    // ============ k) 390px EN DE ============
    console.log("\n─── k) Responsive 390px en allemand ───");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(900);
    const ovf1 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await ss(page, "historique-de-390");
    await page.goto(`${BASE}/dispatch/verification`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const ovf2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const startTxt390 = (await page.textContent(".inv-start").catch(() => "")).replace(/\s+/g, " ").trim();
    ovf1 <= 0 && ovf2 <= 0 && startTxt390.includes("Inventur starten")
      ? pass("k", `390px : aucun débordement horizontal (historique=${ovf1}px, inventaire=${ovf2}px), textes DE lisibles`)
      : fail("k", `390px : débordements historique=${ovf1}px inventaire=${ovf2}px`);
    await ss(page, "verification-de-390");

    // ============ l) CONSOLE ============
    console.log("\n─── l) Console ───");
    missingKeys.length === 0
      ? pass("l1", "aucun warning i18next missingKey")
      : fail("l1", missingKeys.length + " missingKey : " + missingKeys.slice(0, 5).join(" | "));
    console.log("  ℹ️  réponses HTTP >=400 : " + (httpFails.join(" | ") || "aucune"));
    // 401 de bootstrap (avant login) + 4xx volontaires des scans de test
    // (re-scan d'un colis déjà au dépôt, tri en mismatch...) : attendus.
    const expectedFails = httpFails.every((f) =>
      /^401 (GET|POST) .*\/auth\/(me|refresh)$/.test(f) ||
      /^(409|400) POST .*\/dispatch\/scan\/(receive|sort|assign)$/.test(f));
    const realErrors = consoleErrors.filter((e) => !/favicon|manifest|404 \(Not Found\)/i.test(e));
    const onlyExpected = realErrors.every((e) => /401 \(Unauthorized\)|409 \(Conflict\)|400 \(Bad Request\)/.test(e)) && expectedFails;
    realErrors.length === 0
      ? pass("l2", "aucune erreur console")
      : onlyExpected
      ? pass("l2", `aucune erreur applicative (${realErrors.length} attendues : 401 bootstrap + re-scan volontaire)`)
      : fail("l2", realErrors.length + " erreurs : " + realErrors.slice(0, 5).join(" | "));
  } catch (err) {
    fail("FATAL", err.message);
    await ss(page, "fatal");
  }

  console.log("\n═══════════════ RÉSUMÉ ═══════════════");
  const ok = RESULTS.filter((r) => r.ok).length;
  const ko = RESULTS.filter((r) => r.ok === false);
  console.log(`${ok}/${RESULTS.length} OK`);
  ko.forEach((r) => console.log(`  ❌ ${r.id}: ${r.d}`));
  await browser.close();
  process.exit(ko.length ? 1 : 0);
})();
