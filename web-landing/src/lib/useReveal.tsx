import { useEffect, useRef, useState } from "react";

/**
 * Ajoute la classe "in" à l'élément quand il devient visible (animation au scroll).
 * Usage : const ref = useReveal<HTMLDivElement>();  puis  <div ref={ref} className="reveal">
 */
export function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => el.classList.add("in"), delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return ref;
}

/**
 * Compteur animé (ex : 0 → 50k) déclenché quand le chiffre devient visible.
 */
export function CountUp({
  target,
  suffix = "+",
  className,
}: {
  target: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const dur = 1600;
          const start = performance.now();
          const tick = (now: number) => {
            let p = Math.min((now - start) / dur, 1);
            p = 1 - Math.pow(1 - p, 3);
            const v = Math.floor(target * p);
            setVal(target >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v));
            if (p < 1) requestAnimationFrame(tick);
            else setVal(target >= 1000 ? target / 1000 + "k" + suffix : target + suffix);
          };
          requestAnimationFrame(tick);
          io.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, suffix]);

  return (
    <div ref={ref} className={className}>
      {val}
    </div>
  );
}
