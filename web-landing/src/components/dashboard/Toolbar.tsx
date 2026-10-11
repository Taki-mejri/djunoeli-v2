import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

export default function Toolbar({
  searchPlaceholder,
  children,
  right,
}: {
  searchPlaceholder?: string;
  children?: ReactNode;
  right?: ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="tbl-toolbar">
      <div className="tbl-search">
        <Search size={17} />
        <input placeholder={searchPlaceholder ?? t("table.searchPlaceholder")} />
      </div>
      <div className="tbl-filters">{children}</div>
      {right && <div className="tbl-right">{right}</div>}
    </div>
  );
}
