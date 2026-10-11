import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PhoneCall, Plus, Check, Info } from "lucide-react";
import RemoteAssignModal from "../../components/shared/RemoteAssignModal";

/**
 * Page dédiée "Assignation à distance" — accessible depuis la sidebar
 * (admin ET dispatcher). Ouvre la modale unique tout-en-un.
 */
export default function RemoteAssignPage() {
  const { t } = useTranslation("dispatch");
  const [open, setOpen] = useState(false);
  // Bandeau de succès : clé i18n (ou message brut du backend), jamais figé
  const [banner, setBanner] = useState<{ key: string } | { raw: string } | null>(null);

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1><PhoneCall size={22} style={{ verticalAlign: -3, marginRight: 8 }} />{t("remoteAssign.title")}</h1>
          <p>{t("remoteAssign.subtitle")}</p>
        </div>
        <button className="ds-btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} style={{ marginRight: 4 }} /> {t("remoteAssign.newAssignment")}
        </button>
      </div>

      {banner && (
        <div className="ra-page-banner">
          <Check size={16} /> {"raw" in banner ? banner.raw : t(banner.key)}
        </div>
      )}

      <div className="ra-explain">
        <div className="ra-explain-ic"><Info size={22} /></div>
        <div>
          <h3>{t("remoteAssign.explainTitle")}</h3>
          <p>{t("remoteAssign.explain1")}</p>
          <p>{t("remoteAssign.explain2")}</p>
          <ul className="ra-explain-list">
            <li><Check size={14} /> {t("remoteAssign.bullet1")}</li>
            <li><Check size={14} /> {t("remoteAssign.bullet2")}</li>
            <li><Check size={14} /> {t("remoteAssign.bullet3")}</li>
          </ul>
        </div>
      </div>

      <div className="ra-cta-card">
        <PhoneCall size={26} />
        <div>
          <h3>{t("remoteAssign.ctaTitle")}</h3>
          <p>{t("remoteAssign.ctaSubtitle")}</p>
        </div>
        <button className="ds-btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} style={{ marginRight: 4 }} /> {t("remoteAssign.start")}
        </button>
      </div>

      <RemoteAssignModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={(result) => {
          setBanner(result);
          setTimeout(() => setBanner(null), 5000);
        }}
      />
    </>
  );
}
