import { useTranslation } from "react-i18next";
import { X, Wallet, Check } from "lucide-react";

type Props = {
  open: boolean;
  codAmount: number;
  receiverName: string;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
};

export default function DeliveryConfirmModal({
  open,
  codAmount,
  receiverName,
  onClose,
  onConfirm,
  pending,
}: Props) {
  const { t } = useTranslation("livreur");
  const { t: tc } = useTranslation("common");

  if (!open) return null;

  const hasCod = codAmount > 0;
  const amount = codAmount.toFixed(0);

  return (
    <div className="liv-overlay" onClick={(e) => e.target === e.currentTarget && !pending && onClose()}>
      <div className="liv-sheet">
        <button className="liv-sheet-close" onClick={onClose} disabled={pending}>
          <X size={18} />
        </button>

        <div className="liv-sheet-ic ok"><Check size={26} /></div>
        <h3>{t("delivery.title")}</h3>
        <p className="liv-sheet-sub">{t("delivery.question", { name: receiverName })}</p>

        {hasCod && (
          <div className="liv-cod-confirm">
            <Wallet size={20} />
            <div>
              <span className="liv-cod-label">{t("delivery.amountToCollect")}</span>
              <span className="liv-cod-amount">{amount} DT</span>
            </div>
          </div>
        )}

        {hasCod && (
          <p className="liv-cod-warning">{t("delivery.codWarning", { amount })}</p>
        )}

        <div className="liv-sheet-actions">
          <button className="liv-btn-ghost" onClick={onClose} disabled={pending}>
            {tc("actions.cancel")}
          </button>
          <button className="liv-btn-success" onClick={onConfirm} disabled={pending}>
            {pending
              ? t("delivery.validating")
              : hasCod
              ? t("delivery.confirmWithCod", { amount })
              : t("delivery.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
