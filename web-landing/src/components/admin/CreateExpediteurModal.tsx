import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { isAxiosError } from "axios";
import { useCreateExpediteur } from "../../lib/expediteurQueries";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateExpediteurModal({ open, onClose }: Props) {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const create = useCreateExpediteur();
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    password: "",
    city: "",
    pickupAddress: "",
    taxNumber: "",
  });

  if (!open) return null;

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    try {
      await create.mutateAsync({
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        companyName: form.companyName,
        contactPerson: form.contactPerson || undefined,
        city: form.city || undefined,
        pickupAddress: form.pickupAddress || undefined,
        taxNumber: form.taxNumber || undefined,
      });
      // Reset + close
      setForm({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        password: "",
        city: "",
        pickupAddress: "",
        taxNumber: "",
      });
      onClose();
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
          t("expediteurs.form.createError");
        setServerError(msg);
      } else {
        setServerError(t("expediteurs.form.networkError"));
      }
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && !create.isPending && onClose()}
    >
      <div className="modal" style={{ maxWidth: 560 }}>
        <button className="modal-close" onClick={onClose} disabled={create.isPending}>
          <X size={18} />
        </button>
        <h3>{t("expediteurs.form.addTitle")}</h3>
        <p className="m-sub">{t("expediteurs.form.addSubtitle")}</p>

        <form onSubmit={submit}>
          {serverError && <div className="auth-server-err">{serverError}</div>}

          <div className="set-row">
            <div className="set-field">
              <label>{t("expediteurs.form.companyNameRequired")}</label>
              <input required value={form.companyName} onChange={update("companyName")} placeholder="Medina Store" />
            </div>
            <div className="set-field">
              <label>{t("expediteurs.form.contact")}</label>
              <input value={form.contactPerson} onChange={update("contactPerson")} placeholder="Ahmed Karoui" />
            </div>
          </div>

          <div className="set-row">
            <div className="set-field">
              <label>{t("expediteurs.form.emailRequired")}</label>
              <input type="email" required value={form.email} onChange={update("email")} placeholder="contact@medina.de" />
            </div>
            <div className="set-field">
              <label>{t("expediteurs.form.phone")}</label>
              <input value={form.phone} onChange={update("phone")} placeholder="+49 ..." />
            </div>
          </div>

          <div className="set-field">
            <label>{t("expediteurs.form.passwordRequired")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
              placeholder={t("expediteurs.form.passwordHint")}
            />
          </div>

          <div className="set-row">
            <div className="set-field">
              <label>{t("expediteurs.form.city")}</label>
              <input value={form.city} onChange={update("city")} placeholder="Innenstadt-West" />
            </div>
            <div className="set-field">
              <label>{t("expediteurs.form.taxNumber")}</label>
              <input value={form.taxNumber} onChange={update("taxNumber")} placeholder="1234567/A/M/000" />
            </div>
          </div>

          <div className="set-field">
            <label>{t("expediteurs.form.pickupAddressDefault")}</label>
            <input value={form.pickupAddress} onChange={update("pickupAddress")} placeholder="Av. Habib Bourguiba..." />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="tbl-btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={create.isPending}
            >
              {tc("actions.cancel")}
            </button>
            <button type="submit" className="ds-btn-primary" style={{ flex: 1.4 }} disabled={create.isPending}>
              {create.isPending ? t("expediteurs.form.submitting") : t("expediteurs.form.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
