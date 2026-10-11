import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { isAxiosError } from "axios";
import { useCreateLivreur, type VehicleType } from "../../lib/livreurQueries";

type Props = { open: boolean; onClose: () => void };

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  cin: "",
  vehicleType: "MOTO" as VehicleType,
  vehiclePlate: "",
};

export default function CreateLivreurModal({ open, onClose }: Props) {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const create = useCreateLivreur();
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  if (!open) return null;

  const update =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    try {
      await create.mutateAsync({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        cin: form.cin || undefined,
        vehicleType: form.vehicleType,
        vehiclePlate: form.vehiclePlate || undefined,
      });
      setForm(emptyForm);
      onClose();
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
          t("livreurs.form.createError");
        setServerError(msg);
      } else {
        setServerError(t("livreurs.form.networkError"));
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
        <h3>{t("livreurs.form.addTitle")}</h3>
        <p className="m-sub">{t("livreurs.form.addSubtitle")}</p>

        <form onSubmit={submit}>
          {serverError && <div className="auth-server-err">{serverError}</div>}

          <div className="set-row">
            <div className="set-field">
              <label>{t("livreurs.form.firstNameRequired")}</label>
              <input required value={form.firstName} onChange={update("firstName")} placeholder="Skander" />
            </div>
            <div className="set-field">
              <label>{t("livreurs.form.lastNameRequired")}</label>
              <input required value={form.lastName} onChange={update("lastName")} placeholder="Trabelsi" />
            </div>
          </div>

          <div className="set-row">
            <div className="set-field">
              <label>{t("livreurs.form.emailRequired")}</label>
              <input type="email" required value={form.email} onChange={update("email")} placeholder="livreur@djunoeli.tn" />
            </div>
            <div className="set-field">
              <label>{t("livreurs.form.phone")}</label>
              <input value={form.phone} onChange={update("phone")} placeholder="+216 22 145 887" />
            </div>
          </div>

          <div className="set-field">
            <label>{t("livreurs.form.passwordRequired")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
              placeholder={t("livreurs.form.passwordHint")}
            />
          </div>

          <div className="set-row">
            <div className="set-field">
              <label>{t("livreurs.form.cinDigits")}</label>
              <input
                value={form.cin}
                onChange={update("cin")}
                placeholder="12345678"
                maxLength={8}
                pattern="[0-9]{8}"
              />
            </div>
            <div className="set-field">
              <label>{t("livreurs.form.vehicleTypeRequired")}</label>
              <select className="tbl-select" style={{ width: "100%" }} value={form.vehicleType} onChange={update("vehicleType")}>
                {(["MOTO", "VOITURE", "CAMIONNETTE", "CAMION"] as VehicleType[]).map((v) => (
                  <option key={v} value={v}>{t(`livreurs.vehicle.${v}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="set-field">
            <label>{t("livreurs.form.vehiclePlate")}</label>
            <input value={form.vehiclePlate} onChange={update("vehiclePlate")} placeholder="188 TUN 2024" />
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
              {create.isPending ? t("livreurs.form.submitting") : t("livreurs.form.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
