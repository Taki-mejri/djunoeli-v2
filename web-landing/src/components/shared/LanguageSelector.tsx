import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";

/**
 * Sélecteur de langue à drapeaux, à placer dans le topbar.
 * DE / EN. Le choix est mémorisé (localStorage via i18next-browser-languagedetector).
 */

const LANGS = [
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="lang-select" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-label={t("language.select")}>
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-code">{current.code.toUpperCase()}</span>
        <ChevronDown size={14} className={`lang-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="lang-menu">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={`lang-item ${current.code === l.code ? "active" : ""}`}
              onClick={() => change(l.code)}
            >
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-label">{l.label}</span>
              {current.code === l.code && <Check size={15} className="lang-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
