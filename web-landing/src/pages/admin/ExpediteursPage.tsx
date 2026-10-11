import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, AlertCircle } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge, { type Tone } from "../../components/dashboard/StatusBadge";
import {
  useExpediteurs,
  type ExpediteurDTO,
  type ListExpediteursParams,
} from "../../lib/expediteurQueries";
import CreateExpediteurModal from "../../components/admin/CreateExpediteurModal";

const statusTone: Record<ExpediteurDTO["user"]["status"], Tone> = {
  ACTIVE: "green",
  PENDING: "amber",
  SUSPENDED: "red",
};

/** Filtres de statut : valeur envoyée à l'API + clé de son libellé */
const STATUS_FILTERS = [
  { value: "ACTIVE", labelKey: "expediteurs.filterActive" },
  { value: "PENDING", labelKey: "expediteurs.filterPending" },
  { value: "SUSPENDED", labelKey: "expediteurs.filterSuspended" },
] as const;

export default function ExpediteursPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListExpediteursParams["status"]>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const pageSize = 20;
  const params: ListExpediteursParams = {
    page,
    pageSize,
    search: search || undefined,
    status,
  };
  const { data, isLoading, isError, error } = useExpediteurs(params);

  /* Colonnes construites dans le composant : les libellés doivent suivre la langue */
  const columns: Column<ExpediteurDTO>[] = useMemo(() => [
    {
      key: "societe",
      label: t("expediteurs.columns.company"),
      render: (r) => (
        <div className="cell-user">
          <span className="cell-avatar sq">{r.companyName.charAt(0)}</span>
          <div>
            <b>{r.companyName}</b>
            <span className="cell-sub">{r.contactPerson ?? "—"}</span>
          </div>
        </div>
      ),
    },
    { key: "email", label: t("expediteurs.columns.email"), render: (r) => r.user.email },
    { key: "phone", label: t("expediteurs.columns.phone"), render: (r) => r.user.phone ?? "—" },
    { key: "city", label: t("expediteurs.columns.city"), render: (r) => r.city ?? "—" },
    {
      key: "balance",
      label: t("expediteurs.columns.balance"),
      align: "right",
      render: (r) => <span className="num-cell">{Number(r.balance).toFixed(3)} DT</span>,
    },
    {
      key: "status",
      label: t("expediteurs.columns.status"),
      render: (r) => (
        <StatusBadge label={t(`expediteurs.status.${r.user.status}`)} tone={statusTone[r.user.status]} />
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
  ], [t]);

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("expediteurs.title")}</h1>
          <p>{t("expediteurs.countSubtitle", { count: data?.meta.total ?? 0 })}</p>
        </div>
        <button className="ds-btn-primary" onClick={() => setCreateOpen(true)}>
          {t("expediteurs.addShort")}
        </button>
      </div>

      <Toolbar
        searchPlaceholder={t("expediteurs.searchCompany")}
        right={<button className="tbl-btn-ghost">{t("expediteurs.export")}</button>}
      >
        <input
          className="tbl-select"
          style={{ width: 280 }}
          placeholder={t("expediteurs.searchInline")}
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
            setStatus((e.target.value || undefined) as ListExpediteursParams["status"]);
            setPage(1);
          }}
        >
          <option value="">{t("expediteurs.allStatuses")}</option>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
          ))}
        </select>
      </Toolbar>

      {isError && (
        <div className="api-err">
          <AlertCircle size={18} />
          {t("expediteurs.loadError")} : {(error as Error)?.message ?? t("common.unknownError")}
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
              <Pagination
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                onChange={setPage}
              />
            )
          }
        />
      )}

      <CreateExpediteurModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

/* ===== Pagination component (générique, sera réutilisé) ===== */
function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");

  return (
    <div className="pagination">
      <span>{t("common.results", { count: total })}</span>
      <div className="pag-btns">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {tc("pagination.previous")}
        </button>
        <span className="pag-info">
          {t("common.pageOf")} <b>{page}</b> / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          {tc("pagination.next")}
        </button>
      </div>
    </div>
  );
}
