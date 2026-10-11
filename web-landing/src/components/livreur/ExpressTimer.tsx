import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap, AlertTriangle } from "lucide-react";

/**
 * Chrono Express : décompte en direct jusqu'à slaDeadlineAt.
 * - > 15 min restantes : vert
 * - <= 15 min : orange (urgent)
 * - dépassé : rouge "hors délai"
 * Si delivered=true, fige l'affichage (dans les délais / hors délai).
 */
type Props = {
  slaDeadlineAt: string | null;
  slaBreached?: boolean | null;
  delivered?: boolean;
  size?: "sm" | "lg";
};

export default function ExpressTimer({ slaDeadlineAt, slaBreached, delivered, size = "lg" }: Props) {
  const { t } = useTranslation("livreur");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (delivered) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [delivered]);

  if (!slaDeadlineAt) return null;
  const deadline = new Date(slaDeadlineAt).getTime();

  // Cas livré : état figé
  if (delivered) {
    const breached = !!slaBreached;
    return (
      <div className={`xtimer ${breached ? "breach" : "ok"} ${size}`}>
        {breached ? <AlertTriangle size={size === "lg" ? 16 : 13} /> : <Zap size={size === "lg" ? 16 : 13} />}
        {breached ? t("express.deliveredLate") : t("express.deliveredOnTime")}
      </div>
    );
  }

  const remainingMs = deadline - now;
  const overdue = remainingMs <= 0;
  const abs = Math.abs(remainingMs);
  const mm = Math.floor(abs / 60000);
  const ss = Math.floor((abs % 60000) / 1000);
  const clock = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const tone = overdue ? "breach" : remainingMs <= 15 * 60000 ? "urgent" : "ok";

  return (
    <div className={`xtimer ${tone} ${size}`}>
      {overdue ? <AlertTriangle size={size === "lg" ? 16 : 13} /> : <Zap size={size === "lg" ? 16 : 13} />}
      {overdue ? `${t("express.overdue")} ${clock}` : `${t("express.remaining")} ${clock}`}
    </div>
  );
}
