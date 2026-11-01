import { useTranslation } from "react-i18next";
import { useReveal, CountUp } from "../../lib/useReveal.tsx";

export default function Hero({ onLogin }: { onLogin: () => void }) {
  const left = useReveal<HTMLDivElement>();
  const right = useReveal<HTMLDivElement>(150);
  const { t } = useTranslation("common");

  return (
    <section className="hero" id="top">
      <div className="hero-grid" />
      <div className="wrap hero-inner">
        <div ref={left} className="reveal">
          <span className="pill-tag">
            <span className="dot" /> {t("landing.hero.pill")}
          </span>
          <h1>
            {t("landing.hero.title1")}
            <br />
            <span className="accent">{t("landing.hero.title2")}</span>
          </h1>
          <p className="sub">{t("landing.hero.sub")}</p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={onLogin}>
              {t("landing.hero.ctaLogin")}
            </button>
            <a href="#services" className="btn btn-ghost">
              {t("landing.hero.ctaServices")}
            </a>
          </div>
          <div className="hero-trust">
            <div>
              <CountUp target={50000} className="t-num" />
              <div className="t-lbl">{t("landing.hero.statDelivered")}</div>
            </div>
            <div>
              <CountUp target={120} className="t-num" />
              <div className="t-lbl">{t("landing.hero.statDrivers")}</div>
            </div>
            <div>
              <CountUp target={20} suffix="" className="t-num" />
              <div className="t-lbl">{t("landing.hero.statDistricts")}</div>
            </div>
          </div>
        </div>

        <div ref={right} className="reveal">
          <div className="hero-card">
            <div className="track-head">
              <span className="track-id">#TRK-5487-DJ</span>
              <span className="track-badge">{t("landing.hero.card.badge")}</span>
            </div>
            <div className="timeline">
              <div className="tl-step done">
                <span className="node" />
                <div className="s-title">{t("landing.hero.card.created")}</div>
                <div className="s-time">08:12 · Innenstadt-West</div>
              </div>
              <div className="tl-step done">
                <span className="node" />
                <div className="s-title">{t("landing.hero.card.pickedUp")}</div>
                <div className="s-time">09:40 · Depot Dortmund</div>
              </div>
              <div className="tl-step active">
                <span className="node" />
                <div className="s-title">{t("landing.hero.card.outForDelivery")}</div>
                <div className="s-time">11:05 · Hörde</div>
              </div>
              <div className="tl-step pending">
                <span className="node" />
                <div className="s-title">{t("landing.hero.card.delivered")}</div>
                <div className="s-time">{t("landing.hero.card.eta", { time: "12:30" })}</div>
              </div>
            </div>
            <div className="float-badge">
              <span className="float-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04241c" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <div className="fb-num">98.7%</div>
                <div className="fb-lbl">{t("landing.hero.card.successRate")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
