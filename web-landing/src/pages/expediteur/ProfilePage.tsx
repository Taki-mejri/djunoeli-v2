import { useState } from "react";
import { useTranslation } from "react-i18next";

type TabKey = "profile" | "pickup" | "notifications";
const TABS: TabKey[] = ["profile", "pickup", "notifications"];

export default function ProfilePage() {
  const { t } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const [tab, setTab] = useState<TabKey>("profile");

  return (
    <>
      <div className="ds-page-head">
        <div><h1>{t("profile.title")}</h1><p>{t("profile.subtitle")}</p></div>
      </div>
      <div className="settings-tabs">
        {TABS.map((k) => (
          <button key={k} className={`st-tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {t(`profile.tabs.${k}`)}
          </button>
        ))}
      </div>
      <div className="panel settings-panel">
        {tab === "profile" && (
          <>
            <div className="set-field"><label>{t("profile.fields.company")}</label><input defaultValue="Medina Store" /></div>
            <div className="set-row">
              <div className="set-field"><label>{t("profile.fields.contact")}</label><input defaultValue="Ahmed Karoui" /></div>
              <div className="set-field"><label>{t("profile.fields.phone")}</label><input defaultValue="+216 71 220 110" /></div>
            </div>
            <div className="set-field"><label>{t("profile.fields.email")}</label><input defaultValue="contact@medinastore.tn" /></div>
            <div className="set-field"><label>{t("profile.fields.vat")}</label><input defaultValue="1234567/A/M/000" /></div>
            <button className="ds-btn-primary">{tc("actions.save")}</button>
          </>
        )}
        {tab === "pickup" && (
          <>
            <p style={{ color: "var(--muted)", marginBottom: 18 }}>{t("profile.pickup.note")}</p>
            <div className="set-field"><label>{t("profile.pickup.address")}</label><input defaultValue="Av. Habib Bourguiba, immeuble Carthage" /></div>
            <div className="set-row">
              {/* Gouvernorat : non traduit */}
              <div className="set-field"><label>{t("profile.pickup.city")}</label><input defaultValue="Tunis" /></div>
              <div className="set-field"><label>{t("profile.pickup.zip")}</label><input defaultValue="1000" /></div>
            </div>
            <button className="ds-btn-primary">{tc("actions.save")}</button>
          </>
        )}
        {tab === "notifications" && (
          <>
            <div className="set-toggle"><div><b>SMS</b><p>{t("profile.notifications.smsDesc")}</p></div><label className="switch"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="set-toggle"><div><b>WhatsApp</b><p>{t("profile.notifications.whatsappDesc")}</p></div><label className="switch"><input type="checkbox" /><span /></label></div>
            <div className="set-toggle"><div><b>{t("profile.fields.email")}</b><p>{t("profile.notifications.emailDesc")}</p></div><label className="switch"><input type="checkbox" defaultChecked /><span /></label></div>
          </>
        )}
      </div>
    </>
  );
}
