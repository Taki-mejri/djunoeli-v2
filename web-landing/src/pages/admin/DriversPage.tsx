import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, MoreHorizontal, AlertCircle } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge, { type Tone } from "../../components/dashboard/StatusBadge";
import {
  useLivreurs,
  type LivreurDTO,
  type ListLivreursParams,
  type LivreurStatus,
} from "../../lib/livreurQueries";
import CreateLivreurModal from "../../components/admin/CreateLivreurModal";

const livStatusTone: Record<LivreurStatus, Tone> = {
  AVAILABLE: "green",
  BUSY: "amber",
  OFFLINE: "gray",
};

/** Filtres de statut : valeur envoyée à l'API + clé de son libellé */
const STATUS_FILTERS = [
  { value: "AVAILABLE", labelKey: "livreurs.filterAvailable" },
  { value: "BUSY", labelKey: "livreurs.filterBusy" },
  { value: "OFFLINE", labelKey: "livreurs.filterOffline" },
] as const;

export default function DriversPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [livStatus, setLivStatus] = useState<ListLivreursParams["livreurStatus"]>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const pageSize = 20;
  const params: ListLivreursParams = {
    page,
    pageSize,
    search: search || undefined,
    livreurStatus: livStatus,
  };
  const { data, isLoading, isError, error } = useLivreurs(params);

  /* Colonnes construites dans le composant : les libellés doivent suivre la langue */
  const columns: Column<LivreurDTO>[] = useMemo(() => [
    {
      key: "livreur",
      label: t("livreurs.columns.livreur"),
      render: (r) => {
        const name = [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || r.user.email;
        const initial = (r.user.firstName || r.user.email).charAt(0).toUpperCase();
        return (
          <div className="cell-user">
            <span className="cell-avatar">{initial}</span>
            <div>
              <b>{name}</b>
              <span className="cell-sub">{r.user.phone ?? r.user.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "vehicleType",
      label: t("livreurs.columns.vehicle"),
      render: (r) => (
        <div>
          <b style={{ display: "block" }}>
            {t(`livreurs.vehicle.${r.vehicleType}`, { defaultValue: r.vehicleType })}
          </b>
          <span className="cell-sub">{r.vehiclePlate ?? "—"}</span>
        </div>
      ),
    },
    { key: "cin", label: t("livreurs.columns.cin"), render: (r) => r.cin ?? "—" },
    { key: "zone", label: t("livreurs.columns.zone"), render: (r) => r.zone?.name ?? "—" },
    {
      key: "status",
      label: t("livreurs.columns.status"),
      render: (r) => <StatusBadge label={tc(`livreurStatus.${r.status}`)} tone={livStatusTone[r.status]} />,
    },
    {
      key: "totalDeliveries",
      label: t("livreurs.columns.deliveries"),
      align: "center",
      render: (r) => <span className="num-cell">{r.totalDeliveries}</span>,
    },
    {
      key: "rating",
      label: t("livreurs.columns.rating"),
      render: (r) => (
        <span className="rating">
          <Star size={14} fill="#f0b429" stroke="#f0b429" /> {r.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: () => (
        <button className="row-action">
          <MoreHorizontal size={18} />
        </button>
      ),
    },
  ], [t, tc]);

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("livreurs.title")}</h1>
          <p>{t("livreurs.countSubtitle", { count: data?.meta.total ?? 0 })}</p>
        </div>
        <button className="ds-btn-primary" onClick={() => setCreateOpen(true)}>
          {t("livreurs.addShort")}
        </button>
      </div>

      <Toolbar searchPlaceholder={t("livreurs.searchPlaceholder")}>
        <input
          className="tbl-select"
          style={{ width: 280 }}
          placeholder={t("livreurs.searchInline")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="tbl-select"
          value={livStatus ?? ""}
          onChange={(e) => {
            setLivStatus((e.target.value || undefined) as ListLivreursParams["livreurStatus"]);
            setPage(1);
          }}
        >
          <option value="">{t("livreurs.allStatuses")}</option>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
          ))}
        </select>
      </Toolbar>

      {isError && (
        <div className="api-err">
          <AlertCircle size={18} />
          {t("livreurs.loadError")} : {(error as Error)?.message ?? t("common.unknownError")}
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

      <CreateLivreurModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
