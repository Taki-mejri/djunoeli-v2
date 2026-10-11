import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { X, Wallet, Gift, RotateCcw } from "lucide-react";
import { useCreditWallet, useRefundWallet, type WalletRow } from "../../lib/walletQueries";
import { formatEUR } from "../../lib/money";

type Mode = "credit" | "refund";

type Props = {
  open: boolean;
  mode: Mode;
  target: WalletRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
};

export default function CreditWalletModal({ open, mode, target, onClose, onDone }: Props) {
  const { t } = useTranslation("wallet");
  const { t: tc } = useTranslation("common");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const credit = useCreditWallet();
  const refund = useRefundWallet();
  const pending = credit.isPending || refund.isPending;

  if (!open || !target) return null;

  // Ferme en vidant le formulaire (sinon montant/erreur restent pour le prochain expéditeur)
  const close = () => {
    setAmount(""); setNote(""); setError(null);
    onClose();
  };

  const isFirstCredit = mode === "credit" && !target.firstTopupDone;

  const submit = async () => {
    const amt = Number(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t("modal.invalidAmount"));
      return;
    }
    setError(null);
    try {
      const fn = mode === "credit" ? credit : refund;
      const res = await fn.mutateAsync({ expediteurId: target.expediteurId, amount: amt, note: note.trim() || undefined });
      // Le message du backend est en français : on construit la bannière côté
      // client à partir des montants renvoyés, pour qu'elle suive la langue.
      const balance = formatEUR(res.newBalance);
      const amountTxt = formatEUR(amt);
      onDone(
        mode === "refund"
          ? t("modal.refundDone", { amount: amountTxt, balance })
          : "bonusApplied" in res && res.bonusApplied > 0
            ? t("modal.creditDoneBonus", { amount: amountTxt, bonus: formatEUR(res.bonusApplied), balance })
            : t("modal.creditDone", { amount: amountTxt, balance })
      );
      close();
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setError(msg ?? tc("common.error"));
    }
  };

  return (
    <div className="wl-overlay" onClick={(e) => e.target === e.currentTarget && !pending && close()}>
      <div className="wl-modal">
        <button className="wl-modal-close" onClick={close} disabled={pending}><X size={18} /></button>

        <div className={`wl-modal-ic ${mode}`}>
          {mode === "credit" ? <Wallet size={24} /> : <RotateCcw size={24} />}
        </div>
        <h3>{mode === "credit" ? t("modal.creditTitle") : t("modal.refundTitle")}</h3>
        <p className="wl-modal-sub">{target.companyName}</p>

        <div className="wl-modal-balance">
          <span>{t("modal.currentBalance")}</span>
          <b>{formatEUR(target.balance)}</b>
        </div>

        {isFirstCredit && (
          <div className="wl-bonus-hint">
            <Gift size={15} /> {t("modal.bonusHint")}
          </div>
        )}

        <div className="wl-field">
          <label>{t("modal.amount")}</label>
          <div className="wl-amount-input">
            <input
              type="text" inputMode="decimal" autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
            <span>€</span>
          </div>
        </div>

        <div className="wl-field">
          <label>{t("modal.note")} <span className="wl-opt">({tc("common.optional")})</span></label>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "credit" ? t("modal.notePlaceholderCredit") : t("modal.notePlaceholderRefund")}
            maxLength={300}
          />
        </div>

        {error && <div className="wl-error">{error}</div>}

        <div className="wl-modal-actions">
          <button className="wl-btn-ghost" onClick={close} disabled={pending}>{tc("actions.cancel")}</button>
          <button className={`wl-btn-confirm ${mode}`} onClick={submit} disabled={pending || !amount}>
            {pending ? tc("actions.loading")
              : mode === "credit" ? t("modal.confirmCredit") : t("modal.confirmRefund")}
          </button>
        </div>
      </div>
    </div>
  );
}
