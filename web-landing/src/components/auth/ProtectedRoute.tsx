import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  useIsAuthenticated,
  useIsInitialized,
  useUser,
  type UserRole,
} from "../../lib/authStore";

type Props = {
  /** Si fourni, l'utilisateur doit avoir un de ces rôles */
  allowedRoles?: UserRole[];
  /** Où rediriger si non authentifié (par défaut : /admin/login) */
  redirectTo?: string;
};

/**
 * Garde-route.
 *
 * Usage dans App.tsx :
 *   <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "OPERATIONS_MANAGER"]} />}>
 *     <Route path="/admin" element={<DashboardLayout ... />}>
 *       ...
 *     </Route>
 *   </Route>
 */
export default function ProtectedRoute({ allowedRoles, redirectTo = "/admin/login" }: Props) {
  const initialized = useIsInitialized();
  const isAuth = useIsAuthenticated();
  const user = useUser();
  const location = useLocation();

  // 1) Tant qu'on n'a pas tenté le bootstrap, on affiche un loader
  // (évite le flash "redirige vers /login" puis re-bascule sur dashboard)
  if (!initialized) {
    return (
      <div className="auth-bootstrap">
        <div className="auth-spinner" />
      </div>
    );
  }

  // 2) Pas connecté → redirige, en mémorisant la page d'origine
  if (!isAuth || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // 3) Connecté mais rôle non autorisé → redirige vers SA page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 4) OK → rend la route enfant
  return <Outlet />;
}
