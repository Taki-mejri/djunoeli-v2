import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { roleConfig, type RoleKey } from "../../lib/roleConfig";
import { useLogin } from "../../lib/authQueries";
import { dashboardPathForRole, type UserRole } from "../../lib/authStore";
import LanguageSelector from "../../components/shared/LanguageSelector";
import Logo from "../../components/shared/Logo";

/*
 * Schéma construit à partir de `t` : les messages de validation doivent suivre
 * la langue choisie, un schéma figé au module resterait en français.
 */
const makeSchema = (t: (k: string) => string) =>
  z.object({
    email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
    password: z.string().min(6, t("validation.passwordMin")),
    remember: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

/**
 * Erreur serveur : soit une clé de traduction (elle se re-traduit quand on
 * change de langue), soit un message brut renvoyé par le backend.
 */
type ServerError = { key: string; params?: Record<string, string> } | { raw: string };

/** Mappe le slug d'URL vers les rôles backend autorisés à se connecter ici */
const allowedRolesFor: Record<RoleKey, UserRole[]> = {
  admin: ["SUPER_ADMIN", "OPERATIONS_MANAGER", "FINANCE_MANAGER", "WAREHOUSE_MANAGER", "CUSTOMER_SUPPORT"],
  expediteur: ["EXPEDITEUR"],
  livreur: ["LIVREUR"],
  finance: ["FINANCE_MANAGER"],
};

export default function LoginPage({ role }: { role: RoleKey }) {
  const cfg = roleConfig[role];
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const { t } = useTranslation("auth");

  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(makeSchema(t)) });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      const result = await login.mutateAsync({
        email: data.email,
        password: data.password,
      });

      // Sécurité : vérifier que ce rôle a le droit d'utiliser CETTE page de login
      if (!allowedRolesFor[role].includes(result.user.role)) {
        setServerError({
          key: "login.errorWrongRole",
          params: { role: t(`roles.${role}`) },
        });
        return;
      }

      // Redirige vers la page d'origine (si on a été redirigé ici) ou vers le dashboard
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? dashboardPathForRole(result.user.role), { replace: true });
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const message = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
        if (status === 429) {
          setServerError(message ? { raw: message } : { key: "login.errorTooMany" });
        } else if (status === 401) {
          setServerError({ key: "login.error" });
        } else {
          setServerError(message ? { raw: message } : { key: "login.errorGeneric" });
        }
      } else {
        setServerError({ key: "login.errorNetwork" });
      }
    }
  };

  const others = (Object.keys(roleConfig) as RoleKey[]).filter((r) => r !== role);

  return (
    <div className="auth-wrap">
      <aside className={`auth-brand ${cfg.panelClass}`}>
        <div className="auth-brand-top">
          {/* Panneau de marque sur dégradé SOMBRE (les 5 rôles) : le logo complet
              a son texte en bleu foncé et serait illisible ici. On prend donc le
              cercle seul + le nom en blanc, comme prévu par le guide. */}
          <Link to="/" className="logo auth-logo" style={{ color: "#fff" }}>
            <Logo variant="icon" height={44} />
            Djunoeli
          </Link>
        </div>
        <div className="auth-brand-mid">
          <span className="auth-role-pill">
            {cfg.icon} {t(`spaces.${role}`)}
          </span>
          <h2>{t(`taglines.${role}`)}</h2>
          <ul className="auth-bullets">
            {(["b1", "b2", "b3"] as const).map((b) => (
              <li key={b}>
                <span className="ab-ck"><Check size={14} strokeWidth={3} /></span>
                {t(`taglineBullets.${role}.${b}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-brand-bottom">© 2026 Djunoeli — Livraison & Logistique</div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <div className="auth-topline">
            <Link to="/" className="auth-back">
              <ArrowLeft size={16} /> {t("login.backToSite")}
            </Link>
            <LanguageSelector />
          </div>

          <h1 className="auth-title">{t("login.title")}</h1>
          <p className="auth-sub">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <div className="auth-server-err">
                {"key" in serverError ? t(serverError.key, serverError.params ?? {}) : serverError.raw}
              </div>
            )}

            <div className="auth-field">
              <label>{t("login.email")}</label>
              <div className={`auth-input ${errors.email ? "err" : ""}`}>
                <Mail size={18} className="ai-icon" />
                <input
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && <span className="auth-err">{errors.email.message}</span>}
            </div>

            <div className="auth-field">
              <label>{t("login.password")}</label>
              <div className={`auth-input ${errors.password ? "err" : ""}`}>
                <Lock size={18} className="ai-icon" />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder={t("login.passwordPlaceholder")}
                  autoComplete="current-password"
                  {...register("password")}
                />
                <button type="button" className="ai-toggle" onClick={() => setShowPwd((s) => !s)} tabIndex={-1}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="auth-err">{errors.password.message}</span>}
            </div>

            <div className="auth-row">
              <label className="auth-check">
                <input type="checkbox" {...register("remember")} />
                <span>{t("login.rememberMe")}</span>
              </label>
              <a
                className="auth-forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert(t("login.forgotDemo"));
                }}
              >
                {t("login.forgotPassword")}
              </a>
            </div>

            <button type="submit" className="auth-submit" disabled={login.isPending}>
              {login.isPending ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          <div className="auth-switch">
            <span>{t("login.switchPrompt")}</span>
            {others.map((r) => (
              <Link key={r} to={`/${r}/login`} className="auth-switch-link">
                {t(`roles.${r}`)}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
