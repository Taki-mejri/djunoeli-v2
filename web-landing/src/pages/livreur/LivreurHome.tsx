import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, Truck, CheckCircle2, Wallet, ChevronRight } from "lucide-react";
import LivHeader from "../../components/livreur/LivHeader";
import { useUser } from "../../lib/authStore";
import { useMyLivreurProfile, useToggleMyStatus } from "../../lib/livreurQueries";
import { dateLocaleTag } from "../../lib/dateLocale";

export default function LivreurHome() {
  const user = useUser();
  const { t, i18n } = useTranslation("livreur");
  const locale = dateLocaleTag(i18n.language);
  const { data: profile } = useMyLivreurProfile();
  const toggle = useToggleMyStatus();

  const firstName = user?.firstName || user?.email?.split("@")[0] || t("home.fallbackName");
  const available = profile?.status === "AVAILABLE";
  const busy = profile?.status === "BUSY";

  const onToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (toggle.isPending) return;
    toggle.mutate(e.target.checked ? "AVAILABLE" : "OFFLINE");
  };

  // Clé du libellé de disponibilité et du texte explicatif : même logique
  const statusKey = busy ? "busy" : available ? "available" : "offline";

  return (
    <>
      <LivHeader
        title={t("home.greeting", { name: firstName })}
        subtitle={new Date().toLocaleDateString(locale, {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })}
        right={
          <label className="liv-switch">
            <input type="checkbox" checked={available} onChange={onToggle} disabled={toggle.isPending} />
            <span><span className="liv-switch-knob" /></span>
            <span className="liv-switch-lbl">{t(`home.availability.${statusKey}`)}</span>
          </label>
        }
      />

      {/* v2 : carte « espèces en main » (COD) masquée — wallet à venir */}

      <div className="liv-stats">
        <div className="liv-stat">
          <span className="ls-ic blue"><Package size={18} /></span>
          <span className="ls-val">0</span>
          <span className="ls-lbl">{t("home.stats.toDeliver")}</span>
        </div>
        <div className="liv-stat">
          <span className="ls-ic amber"><Truck size={18} /></span>
          <span className="ls-val">0</span>
          <span className="ls-lbl">{t("home.stats.enRoute")}</span>
        </div>
        <div className="liv-stat">
          <span className="ls-ic green"><CheckCircle2 size={18} /></span>
          <span className="ls-val">{profile?.totalDeliveries ?? 0}</span>
          <span className="ls-lbl">{t("home.stats.deliveredTotal")}</span>
        </div>
        <div className="liv-stat">
          <span className="ls-ic teal"><Wallet size={18} /></span>
          <span className="ls-val">{profile?.rating?.toFixed(1) ?? "—"}</span>
          <span className="ls-lbl">{t("home.stats.rating")}</span>
        </div>
      </div>

      <div className="liv-section-title">{t("home.statusTitle")}</div>
      <div className="liv-card">
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          {t(`home.statusText.${statusKey}`)}
        </p>
      </div>

      <Link to="/livreur/jobs" className="liv-see-all" style={{ marginTop: 12 }}>
        {t("home.seeMyJobs")} <ChevronRight size={18} />
      </Link>
    </>
  );
}
