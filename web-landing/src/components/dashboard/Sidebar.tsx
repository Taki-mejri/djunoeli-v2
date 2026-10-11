import { NavLink } from "react-router-dom";
import type { NavGroup } from "../../lib/adminNav";
import Logo from "../shared/Logo";

type Props = {
  open: boolean;
  nav: NavGroup[];
  homePath: string;
  footerTitle?: string;
  footerDesc?: string;
};

export default function Sidebar({ open, nav, homePath, footerTitle, footerDesc }: Props) {
  return (
    <aside className={`ds-sidebar ${open ? "" : "collapsed"}`}>
      <div className="ds-logo">
        {/* Le cercle est un PNG transparent : pas de carré blanc sur le fond marine.
            .ds-logo-text est masqué par le CSS quand la sidebar est repliée,
            il ne reste alors que l'icône. */}
        <Logo variant="icon" height={32} className="ds-logo-img" />
        <span className="ds-logo-text">Djunoeli</span>
      </div>

      <nav className="ds-nav">
        {nav.map((group) => (
          <div className="ds-group" key={group.title}>
            <span className="ds-group-title">{group.title}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === homePath}
                className={({ isActive }) => `ds-link ${isActive ? "active" : ""}`}
                title={item.label}
              >
                <span className="ds-link-ic">{item.icon}</span>
                <span className="ds-link-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {(footerTitle || footerDesc) && (
        <div className="ds-side-foot">
          <div className="ds-plan">
            <div className="ds-plan-t">{footerTitle}</div>
            <div className="ds-plan-d">{footerDesc}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
