import { useTranslation } from "react-i18next";
import { useReveal } from "../../lib/useReveal.tsx";

/** Libellés : common:landing.how.steps.s<n>.{title,desc} */
const steps = [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }];

function Step({ s, delay }: { s: (typeof steps)[number]; delay: number }) {
  const ref = useReveal<HTMLDivElement>(delay);
  const { t } = useTranslation("common");
  return (
    <div ref={ref} className="step reveal">
      <div className="step-n">{s.n}</div>
      <h3>{t(`landing.how.steps.s${s.n}.title`)}</h3>
      <p>{t(`landing.how.steps.s${s.n}.desc`)}</p>
    </div>
  );
}

export default function HowItWorks() {
  const head = useReveal<HTMLDivElement>();
  const { t } = useTranslation("common");
  return (
    <section className="block how" id="how">
      <div className="wrap">
        <div ref={head} className="sec-head reveal">
          <div className="sec-kicker" style={{ color: "var(--teal)" }}>{t("landing.how.kicker")}</div>
          <h2>{t("landing.how.title")}</h2>
          <p>{t("landing.how.intro")}</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <Step key={s.n} s={s} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
