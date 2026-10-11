import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, AlertCircle, AlertTriangle, Plus, X as XIcon } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import {
  useMyShipments,
  shipmentStatusTone,
  type ShipmentDTO,
  type ListShipmentsParams,
} from "../../lib/shipmentQueries";
import CancelShipmentModal from "../../components/expediteur/CancelShipmentModal";
import { dateLocaleTag } from "../../lib/dateLocale";
import { formatEUR } from "../../lib/money";

/** Statuts proposés dans le filtre (libellés pris dans le namespace common) */
const FILTER_STATUSES = [
  "PENDING",
  "AWAITING_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_DELIVERY",
  "CANCELLED",
] as const;

export default function MyShipmentsPage() {
  const { t, i18n } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListShipmentsParams["status"]>(undefined);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; trackingNumber: string } | null>(null);

  const pageSize = 20;
  const params: ListShipmentsParams = {
    page,
    pageSize,
    search: search || undefined,
    status,
  };
  const { data, isLoading, isError, error } = useMyShipments(params);

  const columns: Column<ShipmentDTO>[] = [
    {
      key: "tracking",
      label: t("table.tracking"),
      render: (r) => <b className="mono-cell">{r.trackingNumber}</b>,
    },
    {
      key: "destinataire",
      label: t("table.receiver"),
      render: (r) => (
        <div>
          <b style={{ display: "block" }}>{r.receiverName}</b>
          <span className="cell-sub">{r.receiverPhone}</span>
        </div>
      ),
    },
    {
      key: "ville",
      label: t("table.city"),
      // Quartiers de Dortmund : jamais traduits
      render: (r) => r.deliveryCity,
    },
    {
      key: "type",
      label: t("table.type"),
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {r.deliveryType === "EXPRESS" ? `⚡ ${t("shipmentType.express")}` : t("shipmentType.standard")}
          </span>
          {r.isFragile && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#d23744", fontWeight: 600 }}>
              <AlertTriangle size={11} /> {t("shipmentType.fragile")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "price",
      label: t("table.price"),
      align: "right",
      render: (r) => <span className="num-cell">{formatEUR(r.deliveryPrice)}</span>,
    },
    {
      key: "status",
      label: t("table.status"),
      render: (r) => <StatusBadge label={tc(`status.${r.status}`)} tone={shipmentStatusTone[r.status]} />,
    },
    {
      key: "date",
      label: t("table.createdAt"),
      render: (r) => new Date(r.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Link to={`/expediteur/shipments/${r.id}`} className="row-action-link">
            {t("list.view")}
          </Link>
          {r.status === "PENDING" && (
            <button
              className="row-action-cancel"
              onClick={() => setCancelTarget({ id: r.id, trackingNumber: r.trackingNumber })}
              title={t("list.cancelTitle")}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("list.title")}</h1>
          <p>{t("list.subtitle", { total: data?.meta.total ?? 0 })}</p>
        </div>
        <Link to="/expediteur/new" className="ds-btn-primary">
          <Plus size={16} style={{ marginRight: 4 }} /> {t("list.createCta")}
        </Link>
      </div>

      <Toolbar>
        <input
          className="tbl-select"
          style={{ width: 280 }}
          placeholder={t("list.searchPlaceholder")}
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
          <option value="">{t("list.allStatuses")}</option>
          {FILTER_STATUSES.map((s) => (
            <option key={s} value={s}>{tc(`status.${s}`)}</option>
          ))}
        </select>
      </Toolbar>

      {isError && (
        <div className="api-err">
          <AlertCircle size={18} />
          {t("list.loadError", { message: (error as Error)?.message ?? t("list.unknownError") })}
        </div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : data?.data.length === 0 && !search && !status ? (
        <div className="empty-state">
          <Package size={48} strokeWidth={1.4} />
          <h3>{t("list.empty.title")}</h3>
          <p>{t("list.empty.desc")}</p>
          <Link to="/expediteur/new" className="ds-btn-primary">
            <Plus size={16} style={{ marginRight: 4 }} /> {t("list.empty.cta")}
          </Link>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          footer={
            data && (
              <div className="pagination">
                <span>{t("list.results", { total: data.meta.total })}</span>
                <div className="pag-btns">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    {tc("pagination.previous")}
                  </button>
                  <span className="pag-info">
                    {t("list.page")} <b>{page}</b> / {data.meta.totalPages}
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

      <CancelShipmentModal
        open={!!cancelTarget}
        shipmentId={cancelTarget?.id ?? null}
        trackingNumber={cancelTarget?.trackingNumber ?? null}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}
