import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  ClipboardCheck, Play, CheckCircle2, AlertTriangle, PackageSearch,
  Check, X, ScanLine, Flag, History,
} from "lucide-react";
import {
  useExpected, useCurrentSession, useSessionState,
  useOpenSession, useScanVerify, useCloseSession, useInventoryHistory,
} from "../../lib/inventoryQueries";
import { dateLocaleTag } from "../../lib/dateLocale";

/**
 * Toast : soit une CLÉ i18n (+ params), soit le message brut du backend.
 * Jamais de texte figé — le toast doit suivre la langue active.
 */
type ToastBody =
  | { key: string; params?: Record<string, string | number> }
  | { raw: string };
type Toast = { kind: "ok" | "err" | "warn"; body: ToastBody } | null;

export default function InventoryPage() {
  const { t, i18n } = useTranslation("dispatch");
  const locale = dateLocaleTag(i18n.language);
  const { data: expected } = useExpected();
  const { data: current } = useCurrentSession();
  const openMut = useOpenSession();

  const sessionId = current?.session?.id;
  const { data: state } = useSessionState(sessionId);
  const scanMut = useScanVerify(sessionId ?? "");
  const closeMut = useCloseSession(sessionId ?? "");
  const { data: history } = useInventoryHistory();

  const [scan, setScan] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus quand une session est ouverte
  useEffect(() => {
    if (sessionId) inputRef.current?.focus();
  }, [sessionId, state?.session.verifiedCount]);

  // Le timer du toast précédent doit être annulé : sinon il expire pendant
  // l'affichage du toast suivant et le fait disparaître prématurément.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (kind: "ok" | "err" | "warn", body: ToastBody) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, body });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /** Rend le toast : clé traduite ou message brut du backend */
  const toastText = (b: ToastBody) => ("raw" in b ? b.raw : t(b.key, b.params ?? {}));

  const handleOpen = async () => {
    try {
      await openMut.mutateAsync(undefined);
      flash("ok", { key: "verification.sessionOpened" });
    } catch (err) {
      flash("err", serverBody(err));
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const trk = scan.trim();
    if (!trk || !sessionId) return;
    try {
      await scanMut.mutateAsync(trk);
      setLastVerified(trk);
      flash("ok", { key: "verification.verifiedToast" });
      setScan("");
    } catch (err) {
      // Le backend répond en français : on remappe les 2 cas connus vers des clés
      const msg = axiosMsg(err);
      if (msg && /déjà vérifié/i.test(msg)) {
        flash("warn", { key: "verification.alreadyVerified", params: { tracking: trk } });
      } else if (msg && /pas au dépôt|n'est pas au dépôt/i.test(msg)) {
        flash("warn", { key: "verification.notAtWarehouse", params: { tracking: trk } });
      } else {
        flash("err", serverBody(err));
      }
      setScan("");
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleClose = async () => {
    if (!sessionId) return;
    try {
      await closeMut.mutateAsync(undefined);
      flash("ok", { key: "verification.closedToast" });
    } catch (err) {
      flash("err", serverBody(err));
    }
  };

  const expectedCount = state?.session.expectedCount ?? expected?.summary.expected ?? 0;
  const verifiedCount = state?.session.verifiedCount ?? 0;
  const pct = expectedCount > 0 ? Math.round((verifiedCount / expectedCount) * 100) : 0;
  const missingCount = state?.missing.length ?? 0;

  return (
    <div className="inv-wrap">
      <div className="ds-page-head">
        <div>
          <h1><ClipboardCheck size={22} style={{ verticalAlign: -3, marginRight: 8 }} />{t("verification.title")}</h1>
          <p>{t("verification.subtitle")}</p>
        </div>
      </div>

      {toast && (
        <div className={`inv-toast ${toast.kind}`}>
          {toast.kind === "ok" ? <Check size={16} /> : toast.kind === "warn" ? <AlertTriangle size={16} /> : <X size={16} />}
          {toastText(toast.body)}
        </div>
      )}

      {/* ===== Pas de session ouverte ===== */}
      {!sessionId ? (
        <div className="inv-start">
          <div className="inv-start-ic"><PackageSearch size={40} strokeWidth={1.4} /></div>
          <h2>{t("verification.startTitle")}</h2>
          <p>{t("verification.startHint", { count: expected?.summary.expected ?? 0 })}</p>
          <button className="inv-btn-start" onClick={handleOpen} disabled={openMut.isPending}>
            <Play size={18} /> {openMut.isPending ? t("verification.opening") : t("verification.openSession")}
          </button>
        </div>
      ) : (
        <>
          {/* ===== Progression ===== */}
          <div className="inv-progress-card">
            <div className="inv-progress-top">
              <div>
                <span className="inv-progress-count">{verifiedCount}<span>/{expectedCount}</span></span>
                <span className="inv-progress-label">{t("verification.verifiedCount")}</span>
              </div>
              <div className="inv-progress-pct">{pct}%</div>
            </div>
            <div className="inv-progress-bar">
              <div className="inv-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="inv-progress-legend">
              <span><CheckCircle2 size={13} /> {verifiedCount} {t("verification.verified").toLowerCase()}</span>
              <span className="miss"><AlertTriangle size={13} /> {missingCount} {t("verification.remaining")}</span>
            </div>
          </div>

          {/* ===== Scan ===== */}
          <form className="inv-scan" onSubmit={handleScan}>
            <ScanLine size={20} />
            <input
              ref={inputRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder={t("scan.placeholder")}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={scanMut.isPending || !scan.trim()}>
              {scanMut.isPending ? "..." : t("verification.verify")}
            </button>
          </form>

          {/* ===== Deux colonnes : vérifiés / manquants ===== */}
          <div className="inv-cols">
            <div className="inv-col">
              <h3 className="inv-col-title ok">
                <CheckCircle2 size={16} /> {t("verification.verified")} ({state?.verified.length ?? 0})
              </h3>
              <div className="inv-list">
                {state?.verified.length === 0 && <p className="inv-empty-col">{t("verification.noneVerified")}</p>}
                {state?.verified.map((v) => (
                  <div className={`inv-item ok ${lastVerified === v.trackingNumber ? "flash" : ""}`} key={v.trackingNumber}>
                    <Check size={15} />
                    <div>
                      <b className="mono-cell">{v.trackingNumber}</b>
                      {/* Gouvernorats : non traduits */}
                      <span>{v.receiverName} · {v.deliveryCity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inv-col">
              <h3 className="inv-col-title miss">
                <AlertTriangle size={16} /> {t("verification.missing")} ({missingCount})
              </h3>
              <div className="inv-list">
                {missingCount === 0 && (
                  <p className="inv-empty-col all-ok"><Check size={14} /> {t("verification.allPresent")}</p>
                )}
                {state?.missing.map((m) => (
                  <div className="inv-item miss" key={m.trackingNumber}>
                    <AlertTriangle size={15} />
                    <div>
                      <b className="mono-cell">{m.trackingNumber}</b>
                      <span>{m.receiverName} · {m.deliveryCity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Clôture ===== */}
          <div className="inv-close-bar">
            <div className="inv-close-info">
              <Flag size={16} />
              {missingCount === 0
                ? t("verification.closeAllOk")
                : t("verification.closeInfo", { count: missingCount })}
            </div>
            <button className="inv-btn-close" onClick={handleClose} disabled={closeMut.isPending}>
              {closeMut.isPending ? t("verification.closing") : t("verification.closeSession")}
            </button>
          </div>
        </>
      )}

      {/* ===== Historique ===== */}
      {history && history.length > 0 && (
        <>
          <h2 className="inv-history-title"><History size={16} /> {t("verification.historyTitle")}</h2>
          <div className="inv-history">
            {history.slice(0, 8).map((h) => (
              <div className="inv-hist-row" key={h.id}>
                <span className={`inv-hist-badge ${h.status === "CLOSED" ? "closed" : "open"}`}>
                  {h.status === "CLOSED" ? t("verification.closed") : t("verification.open")}
                </span>
                <span className="inv-hist-by">{h.startedByName}</span>
                <span className="inv-hist-stats">
                  {t("verification.sessionStats", { verified: h.verifiedCount, expected: h.expectedCount })}
                  {h.missingCount > 0 && (
                    <span className="inv-hist-miss"> · {t("verification.missingStat", { count: h.missingCount })}</span>
                  )}
                </span>
                <span className="inv-hist-date">
                  {new Date(h.startedAt).toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Message d'erreur du backend, ou null */
function axiosMsg(err: unknown): string | null {
  return isAxiosError(err)
    ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? null
    : null;
}

/** Corps de toast pour une erreur serveur : message brut, sinon clé générique */
function serverBody(err: unknown): ToastBody {
  const msg = axiosMsg(err);
  return msg ? { raw: msg } : { key: "errors.generic" };
}
