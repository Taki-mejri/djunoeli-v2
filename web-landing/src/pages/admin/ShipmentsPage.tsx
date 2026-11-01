import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, AlertCircle, AlertTriangle, PhoneCall } from "lucide-react";
import RemoteAssignModal from "../../components/shared/RemoteAssignModal";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { dateLocaleTag } from "../../lib/dateLocale";
import {
  useAdminShipments,
  shipmentStatusTone,
  type ShipmentDTO,
  type ListShipmentsParams,
} from "../../lib/shipmentQueries";
import { formatEUR } from "../../lib/money";

/** Statuts proposés au filtre — la valeur envoyée à l'API, le libellé vient de `common` */
const STATUS_FILTERS: ListShipmentsParams["status"][] = [
  "PENDING", "ASSIGNED", "AWAITING_PICKUP", "PICKED_UP", "IN_TRANSIT",
  "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY", "CANCELLED",
];

export default function ShipmentsPage() {
  const { t, i18n } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListShipmentsParams["status"]>(undefined);
  const [raOpen, setRaOpen] = useState(false);

  const pageSize = 20;
  const params: ListShipmentsParams = {
    page,
    pageSize,
    search: search || undefined,
    status,
  };
  const { data, isLoading, isError, error } = useAdminShipments(params);

  /*
   * Colonnes construites DANS le composant : leurs libellés (et les statuts
   * rendus dans les cellules) doivent suivre la bascule FR / DE, ce qu'une
   * constante hors composant ne permet pas.
   */
  const columns: Column<ShipmentDTO>[] = useMemo(() => [
    {
      key: "tracking",
      label: t("shipments.columns.trackingNumber"),
      render: (r) => <b className="mono-cell">{r.trackingNumber}</b>,
    },
    {
      key: "expediteur",
      label: t("shipments.columns.expediteur"),
      render: (r) => (
        <div>
          <b style={{ display: "block" }}>{r.expediteur.companyName}</b>
          <span className="cell-sub">{r.pickupCity}</span>
        </div>
      ),
    },
    {
      key: "destinataire",
      label: t("shipments.columns.receiver"),
      render: (r) => (
        <div>
          <b style={{ display: "block" }}>{r.receiverName}</b>
          <span className="cell-sub">{r.deliveryCity}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: t("shipments.columns.type"),
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {r.deliveryType === "EXPRESS" ? `⚡ ${t("shipments.express")}` : t("shipments.standard")}
          </span>
          {r.isFragile && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#d23744", fontWeight: 600 }}>
              <AlertTriangle size={11} /> {t("shipments.fragile")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "price",
      label: t("shipments.columns.price"),
      align: "right",
      render: (r) => <span className="num-cell">{formatEUR(r.deliveryPrice)}</span>,
    },
    {
      key: "cod",
      label: t("shipments.columns.cod"),
      align: "right",
      render: (r) => {
        const amount = Number(r.codAmount);
        return amount > 0 ? <span className="num-cell">{formatEUR(amount)}</span> : <span className="cell-sub">—</span>;
      },
    },
    {
      key: "status",
      label: t("shipments.columns.status"),
      render: (r) => <StatusBadge label={tc(`status.${r.status}`)} tone={shipmentStatusTone[r.status]} />,
    },
    {
      key: "date",
      label: t("shipments.columns.createdAt"),
      render: (r) => new Date(r.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <Link to={`/admin/shipments/${r.id}`} className="row-action-link">
          {t("shipments.view")}
        </Link>
      ),
    },
  ], [t, tc, locale]);

  const total = data?.meta.total ?? 0;

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("shipments.title")}</h1>
          <p>{t("shipments.countSubtitle", { count: total })}</p>
        </div>
        <div className="kpi-mini-grid">
          <span className="kpi-mini">
            <Package size={14} /> {t("shipments.totalBadge", { count: total })}
          </span>
          <button className="ds-btn-secondary" onClick={() => setRaOpen(true)}>
            <PhoneCall size={15} style={{ marginRight: 6 }} /> {t("shipments.remoteAssign")}
          </button>
        </div>
      </div>

      <Toolbar searchPlaceholder={t("shipments.searchPlaceholder")}>
        <input
          className="tbl-select"
          style={{ width: 280 }}
          placeholder={t("shipments.searchInline")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="tbl-select"
          value={status ?? ""}
          onChange={(e) => {
            setStatus((e.target.value || undefined) as ListShipmentsParams["status"]);
            setPage(1);
          }}
        >
          <option value="">{t("shipments.allStatuses")}</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{tc(`status.${s}`)}</option>
          ))}
        </select>
      </Toolbar>

      {isError && (
        <div className="api-err">
          <AlertCircle size={18} />
          {t("shipments.loadError")} : {(error as Error)?.message ?? t("common.unknownError")}
        </div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          footer={
            data && (
              <div className="pagination">
                <span>{t("common.results", { count: data.meta.total })}</span>
                <div className="pag-btns">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    {tc("pagination.previous")}
                  </button>
                  <span className="pag-info">
                    {t("common.pageOf")} <b>{page}</b> / {data.meta.totalPages}
                  </span>
                  <button disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                    {tc("pagination.next")}
                  </button>
                </div>
              </div>
            )
          }
        />
      )}

      <RemoteAssignModal open={raOpen} onClose={() => setRaOpen(false)} />
    </>
  );
}
