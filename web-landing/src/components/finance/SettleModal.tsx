import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Wallet } from "lucide-react";
import { isAxiosError } from "axios";

type Props = {
  open: boolean;
  title: string;
  subtitle: string;
  /** Montant proposé par défaut (solde total) */
  defaultAmount: number;
  /** Autoriser un montant partiel (livreur oui, expéditeur non) */
  allowPartial: boolean;
  onClose: () => void;
  onConfirm: (data: { amount?: number; method: string; reference?: string }) => Promise<void>;
};

/**
 * Méthodes de reversement : la constante ne porte qu'une CLÉ, jamais un libellé.
 * La traduction se fait au rendu (une constante hors composant ne peut pas
 * appeler useTranslation), donc les boutons suivent la bascule FR / DE.
 */
const METHODS = [
  { key: "CASH", labelKey: "methods.cash" },
  { key: "BANK_TRANSFER", labelKey: "methods.bankTransfer" },
  { key: "CHECK", labelKey: "methods.check" },
];

export default function SettleModal({
  open, title, subtitle, defaultAmount, allowPartial, onClose, onConfirm,
}: Props) {
  const { t } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setPending(true);
    try {
      await onConfirm({
        amount: allowPartial && partial ? Number(amount) : undefined,
        method,
        reference: reference.trim() || undefined,
      });
      onClose();
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setError(msg ?? t("settle.error"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && !pending && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <button className="modal-close" onClick={onClose} disabled={pending}><X size={18} /></button>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div className="fin-modal-ic"><Wallet size={26} /></div>
        </div>
        <h3 style={{ textAlign: "center" }}>{title}</h3>
        <p className="m-sub" style={{ textAlign: "center" }}>{subtitle}</p>

        <div className="fin-amount-display">
          <span>{allowPartial && partial ? t("settle.amountToRemit") : t("settle.totalAmount")}</span>
          <b>{(allowPartial && partial ? Number(amount) || 0 : defaultAmount).toFixed(0)} DT</b>
        </div>

        {allowPartial && (
          <label className="fin-partial-toggle">
            <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
            {t("settle.partial")}
          </label>
        )}

        {allowPartial && partial && (
          <div className="set-field">
            <label>{t("settle.amountMax", { max: defaultAmount.toFixed(0) })}</label>
            <input
              type="number" min="1" max={defaultAmount} step="1"
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        )}

        <div className="set-field">
          <label>{t("settle.method")}</label>
          <div className="fin-method-row">
            {METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`fin-method-btn ${method === m.key ? "active" : ""}`}
                onClick={() => setMethod(m.key)}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="set-field">
          <label>{t("settle.reference")}</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t("settle.referencePlaceholder")}
            maxLength={100}
          />
        </div>

        {error && <div className="auth-server-err" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="tbl-btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={pending}>
            {tc("actions.cancel")}
          </button>
          <button className="fin-btn-confirm" style={{ flex: 1.5 }} onClick={submit} disabled={pending}>
            {pending ? t("settle.saving") : t("settle.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
