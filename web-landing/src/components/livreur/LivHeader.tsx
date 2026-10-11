import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
};

export default function LivHeader({ title, subtitle, back, right }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation("livreur");
  return (
    <header className="liv-header">
      {back ? (
        <button className="liv-back" onClick={() => navigate(-1)} aria-label={t("header.back")}>
          <ChevronLeft size={22} />
        </button>
      ) : (
        <div className="liv-back-spacer" />
      )}
      <div className="liv-h-title">
        <h1>{title}</h1>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="liv-h-right">{right}</div>
    </header>
  );
}
