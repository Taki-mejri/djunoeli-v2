import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
};

/**
 * Raisons rapides : on ne stocke que des CLÉS i18n. Le libellé affiché est
 * traduit au rendu, et c'est ce libellé (dans la langue du livreur) qui part
 * au backend comme note d'échec — c'est du texte saisi par l'utilisateur.
 */
const QUICK_REASON_KEYS = [
  "failure.reasonAbsent",
  "failure.reasonAddress",
  "failure.reasonPhone",
  "failure.reasonRefused",
  "failure.reasonRescheduled",
];

export default function FailureModal({ open, onClose, onConfirm, pending }: Props) {
  const { t } = useTranslation("livreur");
  const { t: tc } = useTranslation("common");
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="liv-overlay" onClick={(e) => e.target === e.currentTarget && !pending && onClose()}>
      <div className="liv-sheet">
        <button className="liv-sheet-close" onClick={onClose} disabled={pending}>
          <X size={18} />
        </button>

        <div className="liv-sheet-ic fail"><AlertTriangle size={26} /></div>
        <h3>{t("failure.title")}</h3>
        <p className="liv-sheet-sub">{t("failure.subtitle")}</p>

        <div className="liv-quick-reasons">
          {QUICK_REASON_KEYS.map((key) => {
            const label = t(key);
            return (
              <button
                key={key}
                type="button"
                className={`liv-quick-btn ${reason === label ? "active" : ""}`}
                onClick={() => setReason(label)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <textarea
          className="liv-textarea"
          placeholder={t("failure.detailsPlaceholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={300}
        />

        <div className="liv-sheet-actions">
          <button className="liv-btn-ghost" onClick={onClose} disabled={pending}>
            {tc("actions.cancel")}
          </button>
          <button
            className="liv-btn-danger"
            onClick={() => onConfirm(reason.trim())}
            disabled={pending || reason.trim().length < 3}
          >
            {pending ? t("failure.saving") : t("failure.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
