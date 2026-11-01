import { useTranslation } from "react-i18next";
import { useReveal } from "../../lib/useReveal.tsx";

const Check = () => (
  <span className="ck">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>
);

export default function About() {
  const text = useReveal<HTMLDivElement>();
  const visual = useReveal<HTMLDivElement>(120);
  const { t } = useTranslation("common");
  return (
    <section className="block" id="about">
      <div className="wrap about-grid">
        <div ref={text} className="about-text reveal">
          <div className="sec-kicker">{t("landing.about.kicker")}</div>
          <h2>{t("landing.about.title")}</h2>
          <p>{t("landing.about.p1")}</p>
          <p>{t("landing.about.p2")}</p>
          <ul className="check-list">
            <li><Check /> {t("landing.about.check1")}</li>
            <li><Check /> {t("landing.about.check2")}</li>
            <li><Check /> {t("landing.about.check3")}</li>
          </ul>
        </div>
        <div ref={visual} className="about-visual reveal">
          <div className="a-card">
            <div className="a-stat-grid">
              <div className="a-stat accent"><div className="n">98.7%</div><div className="l">{t("landing.about.stat1")}</div></div>
              <div className="a-stat"><div className="n">2.4h</div><div className="l">{t("landing.about.stat2")}</div></div>
              <div className="a-stat"><div className="n">24/24</div><div className="l">{t("landing.about.stat3")}</div></div>
              <div className="a-stat"><div className="n">+1.2k</div><div className="l">{t("landing.about.stat4")}</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
