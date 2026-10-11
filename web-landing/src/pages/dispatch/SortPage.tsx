import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow } from "lucide-react";
import ScanStation from "../../components/dispatch/ScanStation";
import { axiosMessage, type ScanFeedback } from "../../lib/scanFeedback";
import { useScanSort } from "../../lib/dispatcherQueries";
import { dateLocaleTag } from "../../lib/dateLocale";
import { DORTMUND_DISTRICTS } from "../../lib/dortmund";

type RecentSort = {
  trackingNumber: string;
  governorate: string;
  match: boolean;
  at: string;
};

export default function SortPage() {
  const { t, i18n } = useTranslation("dispatch");
  const locale = dateLocaleTag(i18n.language);
  const scan = useScanSort();
  const [governorate, setGovernorate] = useState("");
  /*
   * Historique des 20 derniers tris. Il est alimenté (setRecent ci-dessous)
   * mais pas encore affiché : le panneau qui le rendra reste à construire.
   * La valeur n'est donc pas liée (trou de destructuration) : c'est la lecture
   * inutilisée qui bloquait `npm run build` (noUnusedLocals), pas l'écriture.
   */
  const [, setRecent] = useState<RecentSort[]>([]);

  const handleScan = async (tracking: string): Promise<ScanFeedback> => {
    try {
      const result = await scan.mutateAsync({
        trackingNumber: tracking,
        destinationGovernorate: governorate,
      });
      const s = result.shipment;

      setRecent((prev) => [
        {
          trackingNumber: s.trackingNumber,
          governorate,
          match: result.matchesDestination,
          at: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ].slice(0, 20));

      if (result.matchesDestination) {
        return {
          kind: "success",
          title: { key: "sorting.success", params: { tracking: s.trackingNumber, city: governorate } },
          detail: { key: "sorting.detailOk" },
        };
      }
      // Mismatch : le message porte le bac scanné ET la destination réelle
      return {
        kind: "warn",
        title: {
          key: "sorting.mismatch",
          params: { tracking: s.trackingNumber, city: governorate, realCity: s.deliveryCity },
        },
      };
    } catch (err) {
      const msg = axiosMessage(err);
      if (msg && /doit d'abord être réceptionné|n'est pas au dépôt/i.test(msg)) {
        return { kind: "error", title: { key: "sorting.notAtWarehouse", params: { tracking } } };
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
      title={t("sorting.title")}
      subtitle={t("sorting.subtitle")}
      onScan={handleScan}
      disabled={!governorate}
      disabledHint={t("sorting.binDisabled")}
      placeholder="TRK-2026-..."
    >
      <div className="dsp-selector">
        <label>{t("sorting.binLabel")}</label>
        <select
          className="tbl-select"
          value={governorate}
          onChange={(e) => setGovernorate(e.target.value)}
          style={{ width: "100%", maxWidth: 340 }}
        >
          <option value="">{t("sorting.chooseGov")}</option>
          {/* Quartiers : noms propres, non traduits */}
          {DORTMUND_DISTRICTS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {governorate && (
        <div className="dsp-active-bin">
          <ArrowDownWideNarrow size={16} />
          {t("sorting.activeBin", { city: governorate })} — {t("sorting.activeBinHint")}
        </div>
      )}
    </ScanStation>
  );
}
