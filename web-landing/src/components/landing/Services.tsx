import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useReveal } from "../../lib/useReveal.tsx";

/** `key` → common:landing.services.items.<key>.{title,desc} */
type Service = {
  key: string;
  icon: ReactNode;
  popular?: boolean;
};

const services: Service[] = [
  {
    key: "sameDay",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    key: "billing",
    popular: true,
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    key: "tracking",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    key: "coverage",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    key: "dashboard",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    key: "notifications",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

function Card({ s, delay }: { s: Service; delay: number }) {
  const ref = useReveal<HTMLDivElement>(delay);
  const { t } = useTranslation("common");
  return (
    <div ref={ref} className="svc reveal">
      {s.popular && <span className="tag-mini">{t("landing.services.popular")}</span>}
      <div className="svc-ic">{s.icon}</div>
      <h3>{t(`landing.services.items.${s.key}.title`)}</h3>
      <p>{t(`landing.services.items.${s.key}.desc`)}</p>
    </div>
  );
}

export default function Services() {
  const head = useReveal<HTMLDivElement>();
  const { t } = useTranslation("common");
  return (
    <section className="block" id="services">
      <div className="wrap">
        <div ref={head} className="sec-head reveal">
          <div className="sec-kicker">{t("landing.services.kicker")}</div>
          <h2>{t("landing.services.title")}</h2>
          <p>{t("landing.services.intro")}</p>
        </div>
        <div className="svc-grid">
          {services.map((s, i) => (
            <Card key={s.key} s={s} delay={(i % 3) * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}
