import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import ScanStation from "../../components/dispatch/ScanStation";
import { axiosMessage, type ScanFeedback } from "../../lib/scanFeedback";
import { useScanReceive } from "../../lib/dispatcherQueries";
import { dateLocaleTag } from "../../lib/dateLocale";

type RecentScan = {
  trackingNumber: string;
  receiverName: string;
  deliveryCity: string;
  at: string;
};

export default function ReceptionPage() {
  const { t, i18n } = useTranslation("dispatch");
  const locale = dateLocaleTag(i18n.language);
  const scan = useScanReceive();
  const [recent, setRecent] = useState<RecentScan[]>([]);

  const handleScan = async (tracking: string): Promise<ScanFeedback> => {
    try {
      const result = await scan.mutateAsync({ trackingNumber: tracking });
      const s = result.shipment;
      setRecent((prev) => [
        {
          trackingNumber: s.trackingNumber,
          receiverName: s.receiverName,
          deliveryCity: s.deliveryCity,
          at: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ].slice(0, 20));

      return {
        kind: "success",
        title: { key: "reception.success", params: { tracking: s.trackingNumber } },
        // Le `nextStep` du backend est en français : on compose le détail
        // côté client à partir de clés, avec les données du colis.
        detail: { key: "reception.detail", params: { receiver: s.receiverName, city: s.deliveryCity } },
      };
    } catch (err) {
      // Le backend répond en français : on remappe les cas connus vers des clés
      const msg = axiosMessage(err);
      if (msg && /déjà enregistré/i.test(msg)) {
        return { kind: "warn", title: { key: "reception.alreadyReceived", params: { tracking } } };
      }
      if (msg && /introuvable/i.test(msg)) {
        return { kind: "error", title: { key: "reception.notFound", params: { tracking } } };
      }
      return {
        kind: "error",
        title: { key: "scan.failed" },
        detail: msg ? { raw: msg } : { key: "scan.error" },
        trackingNumber: tracking,
      };
    }
  };

  return (
    <ScanStation
      title={t("reception.title")}
      subtitle={t("reception.subtitle")}
      onScan={handleScan}
      recentList={
        recent.length > 0 && (
          <>
            <p className="dsp-recent-title">{t("reception.sessionTitle", { count: recent.length })}</p>
            <div className="dsp-recent-list">
              {recent.map((r, i) => (
                <div className="dsp-recent-row" key={`${r.trackingNumber}-${i}`}>
                  <Package size={16} />
                  <span className="mono-cell dsp-recent-trk">{r.trackingNumber}</span>
                  {/* Gouvernorats tunisiens : jamais traduits */}
                  <span className="dsp-recent-info">{r.receiverName} · {r.deliveryCity}</span>
                  <span className="dsp-recent-badge">{t("reception.scanned")}</span>
                  <span className="dsp-recent-time">{r.at}</span>
                </div>
              ))}
            </div>
          </>
        )
      }
    />
  );
}
