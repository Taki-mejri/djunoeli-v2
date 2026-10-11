import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  footer?: ReactNode;
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  footer,
}: Props<T>) {
  const { t } = useTranslation("common");

  return (
    <div className="dtable-wrap">
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align ?? "left", width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="dtable-empty">
                {t("table.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? "left" }}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {footer && <div className="dtable-foot">{footer}</div>}
    </div>
  );
}
