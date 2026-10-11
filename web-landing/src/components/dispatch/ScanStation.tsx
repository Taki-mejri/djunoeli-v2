import { useRef, useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScanLine, Check, AlertTriangle, X } from "lucide-react";
import { axiosMessage, type I18nText, type ScanFeedback } from "../../lib/scanFeedback";

type Props = {
  title: string;
  subtitle: string;
  placeholder?: string;
  /** Contenu additionnel à afficher au-dessus du champ (ex: sélecteur livreur) */
  children?: ReactNode;
  /** Appelé quand l'utilisateur soumet un tracking. Doit renvoyer un feedback. */
  onScan: (trackingNumber: string) => Promise<ScanFeedback>;
  /** Désactive le champ (ex: si aucun livreur sélectionné en mode assignation) */
  disabled?: boolean;
  disabledHint?: string;
  /** Liste des scans récents affichés en dessous */
  recentList?: ReactNode;
};

const TRACKING_RE = /^TRK-\d{4}-\d{5}$/i;

export default function ScanStation({
  title,
  subtitle,
  placeholder = "TRK-2026-...",
  children,
  onScan,
  disabled = false,
  disabledHint,
  recentList,
}: Props) {
  const { t } = useTranslation("dispatch");
  const { t: tc } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);

  /** Rend un I18nText : clé traduite (avec params) ou message brut du backend */
  const text = (x: I18nText): string => ("raw" in x ? x.raw : t(x.key, x.params ?? {}));

  // Garde le focus sur le champ pour permettre le scan en rafale
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, busy]);

  const submit = async () => {
    const tracking = value.trim().toUpperCase();
    if (!tracking) return;

    if (!TRACKING_RE.test(tracking)) {
      setFeedback({
        kind: "error",
        title: { key: "scan.invalidFormat" },
        detail: { key: "scan.invalidFormatDetail" },
      });
      setValue("");
      return;
    }

    setBusy(true);
    try {
      const result = await onScan(tracking);
      setFeedback(result);
      setValue("");
    } catch (err) {
      // Filet de sécurité : erreur non traitée par la page appelante
      const msg = axiosMessage(err);
      setFeedback({
        kind: "error",
        title: { key: "scan.failed" },
        detail: msg ? { raw: msg } : { key: "scan.error" },
        trackingNumber: tracking,
      });
      setValue("");
    } finally {
      setBusy(false);
      // Re-focus après le scan
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {children}

      {/* Zone de scan centrale */}
      <div className={`dsp-scanbox ${disabled ? "disabled" : ""}`}>
        <ScanLine size={34} className="dsp-scan-ic" />
        <p className="dsp-scan-label">
          {disabled ? disabledHint ?? t("scan.disabled") : t("scan.label")}
        </p>
        <input
          ref={inputRef}
          className="dsp-scan-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled || busy}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="dsp-scan-hint">
          {busy ? t("scan.processing") : t("scan.burstHint")}
        </p>
      </div>

      {/* Feedback du dernier scan */}
      {feedback && (
        <div className={`dsp-feedback dsp-feedback-${feedback.kind}`}>
          <div className="dsp-fb-icon">
            {feedback.kind === "success" ? (
              <Check size={20} />
            ) : feedback.kind === "warn" ? (
              <AlertTriangle size={20} />
            ) : (
              <X size={20} />
            )}
          </div>
          <div className="dsp-fb-body">
            <p className="dsp-fb-title">
              {feedback.trackingNumber && <span className="mono-cell">{feedback.trackingNumber}</span>}{" "}
              {text(feedback.title)}
            </p>
            {feedback.detail && <p className="dsp-fb-detail">{text(feedback.detail)}</p>}
          </div>
          <button className="dsp-fb-close" onClick={() => setFeedback(null)} aria-label={tc("actions.close")}>
            <X size={16} />
          </button>
        </div>
      )}

      {recentList}
    </>
  );
}
