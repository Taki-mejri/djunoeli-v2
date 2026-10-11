import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Truck, Star, Package, MapPin, LogOut, Bell, Globe } from "lucide-react";
import LivHeader from "../../components/livreur/LivHeader";
import LanguageSelector from "../../components/shared/LanguageSelector";

export default function LivProfilePage() {
  const [available, setAvailable] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation("livreur");

  return (
    <>
      <LivHeader title={t("profile.title")} />

      <div className="liv-profile-card">
        <div className="liv-avatar-big">S</div>
        <h2>Skander Trabelsi</h2>
        {/* Le rôle se traduit, le quartier non */}
        <p>{t("profile.role")} · Innenstadt-Nord</p>
        <div className="liv-prof-stats">
          <div><span className="lps-v">142</span><span className="lps-l">{t("profile.stats.deliveries")}</span></div>
          <div><span className="lps-v"><Star size={15} fill="#f0b429" stroke="#f0b429" /> 4.9</span><span className="lps-l">{t("profile.stats.rating")}</span></div>
          <div><span className="lps-v">98%</span><span className="lps-l">{t("profile.stats.successRate")}</span></div>
        </div>
      </div>

      <div className="liv-prof-row">
        <div className="lpr-left">
          <span className="lpr-ic"><Truck size={18} /></span>
          <div><b>{t("profile.rows.availability")}</b><span>{t("profile.rows.availabilityDesc")}</span></div>
        </div>
        <label className="liv-switch">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <span><span className="liv-switch-knob" /></span>
        </label>
      </div>

      <div className="liv-prof-row">
        <div className="lpr-left">
          <span className="lpr-ic"><MapPin size={18} /></span>
          {/* Quartiers : non traduits */}
          <div><b>{t("profile.rows.zone")}</b><span>Innenstadt-Nord, Eving</span></div>
        </div>
      </div>

      <div className="liv-prof-row">
        <div className="lpr-left">
          <span className="lpr-ic"><Package size={18} /></span>
          <div><b>{t("profile.rows.vehicle")}</b><span>{t("profile.rows.vehicleValue")}</span></div>
        </div>
      </div>

      <div className="liv-prof-row">
        <div className="lpr-left">
          <span className="lpr-ic"><Bell size={18} /></span>
          <div><b>{t("profile.rows.notifications")}</b><span>{t("profile.rows.notificationsOn")}</span></div>
        </div>
      </div>

      {/* Ligne langue : sélecteur réellement actionnable (en plus de celui du topbar) */}
      <div className="liv-prof-row">
        <div className="lpr-left">
          <span className="lpr-ic"><Globe size={18} /></span>
          <div><b>{t("profile.rows.language")}</b></div>
        </div>
        <LanguageSelector />
      </div>

      <button className="liv-logout" onClick={() => navigate("/")}>
        <LogOut size={18} /> {t("profile.logout")}
      </button>
    </>
  );
}
