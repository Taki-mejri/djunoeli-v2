import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicLayout from "./components/landing/PublicLayout";
import PublicTrackPage from "./pages/public/PublicTrackPage";
import FinanceLayout from "./components/finance/FinanceLayout";
import AdminLayout from "./components/admin/AdminLayout";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ShipmentsPage from "./pages/admin/ShipmentsPage";
import ShipmentDetailPageAdmin from "./pages/admin/ShipmentDetailPage";
import TrackingPage from "./pages/admin/TrackingPage";
import DriversPage from "./pages/admin/DriversPage";
import ExpediteursPage from "./pages/admin/ExpediteursPage";
import CustomersPage from "./pages/admin/CustomersPage";
import WarehousesPage from "./pages/admin/WarehousesPage";
import CodPage from "./pages/admin/CodPage";
import InvoicesPage from "./pages/admin/InvoicesPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AdminFinanceOverviewPage from "./pages/admin/AdminFinanceOverviewPage";
import SupportPage from "./pages/admin/SupportPage";
import SettingsPage from "./pages/admin/SettingsPage";
import WalletsPage from "./pages/admin/WalletsPage";
import AssignPage from "./pages/admin/AssignPage";

// Expediteur pages
import ExpediteurDashboard from "./pages/expediteur/ExpediteurDashboard";
import CreateShipmentPage from "./pages/expediteur/CreateShipmentPage";
import MyShipmentsPage from "./pages/expediteur/MyShipmentsPage";
import ShipmentDetailPageExpediteur from "./pages/expediteur/ShipmentDetailPage";
import ExpInvoicesPage from "./pages/expediteur/ExpInvoicesPage";
import ExpCodPage from "./pages/expediteur/ExpCodPage";
import ProfilePage from "./pages/expediteur/ProfilePage";
import WalletPage from "./pages/expediteur/WalletPage";
import ExpediteurLayout from "./components/expediteur/ExpediteurLayout";

// Livreur pages
import LivreurLayout from "./components/livreur/LivreurLayout";
import LivreurHome from "./pages/livreur/LivreurHome";
import JobsListPage from "./pages/livreur/JobsListPage";
import JobDetailPage from "./pages/livreur/JobDetailPage";
import LivCodPage from "./pages/livreur/LivCodPage";
import LivProfilePage from "./pages/livreur/LivProfilePage";

// Shared pages
import RemoteAssignPage from "./pages/shared/RemoteAssignPage";

// Finance pages
import FinanceHome from "./pages/finance/FinanceHome";
import LivreurBalancesPage from "./pages/finance/LivreurBalancesPage";
import ExpediteurCodPage from "./pages/finance/ExpediteurCodPage";
import InvoicesPage_Finance from "./pages/finance/InvoicesPage";
import ReportsPage_Finance from "./pages/finance/ReportsPage";

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "FINANCE_MANAGER",
  "WAREHOUSE_MANAGER",
  "CUSTOMER_SUPPORT",
] as const;

export default function App() {
  return (
    <Routes>
      {/* ----- Public ----- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/login" element={<LoginPage role="admin" />} />
      <Route path="/expediteur/login" element={<LoginPage role="expediteur" />} />
      <Route path="/livreur/login" element={<LoginPage role="livreur" />} />
      <Route path="/finance/login" element={<LoginPage role="finance" />} />

      {/* ----- Suivi public (PAS de ProtectedRoute) ----- */}
      <Route element={<PublicLayout />}>
        <Route path="/track" element={<PublicTrackPage />} />
        <Route path="/track/:trackingNumber" element={<PublicTrackPage />} />
      </Route>

      {/* ----- Admin (protégé) ----- */}
      <Route element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]} redirectTo="/admin/login" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="shipments" element={<ShipmentsPage />} />
          <Route path="shipments/:id" element={<ShipmentDetailPageAdmin />} />
          <Route path="assign" element={<AssignPage />} />
          <Route path="remote-assign" element={<RemoteAssignPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="expediteurs" element={<ExpediteursPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="cod" element={<CodPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="finance" element={<AdminFinanceOverviewPage />} />
          <Route path="wallets" element={<WalletsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ----- Expediteur (protégé) ----- */}
      <Route element={<ProtectedRoute allowedRoles={["EXPEDITEUR"]} redirectTo="/expediteur/login" />}>
        <Route path="/expediteur" element={<ExpediteurLayout />}>
          <Route index element={<ExpediteurDashboard />} />
          <Route path="new" element={<CreateShipmentPage />} />
          <Route path="shipments" element={<MyShipmentsPage />} />
          <Route path="shipments/:id" element={<ShipmentDetailPageExpediteur />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="invoices" element={<ExpInvoicesPage />} />
          <Route path="cod" element={<ExpCodPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ----- Livreur (protégé) ----- */}
      <Route element={<ProtectedRoute allowedRoles={["LIVREUR"]} redirectTo="/livreur/login" />}>
        <Route path="/livreur" element={<LivreurLayout />}>
          <Route index element={<LivreurHome />} />
          <Route path="jobs" element={<JobsListPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="cod" element={<LivCodPage />} />
          <Route path="profile" element={<LivProfilePage />} />
        </Route>
      </Route>

      {/* ----- Ancien espace dispatcher : retiré en v2 (l'admin assigne) ----- */}
      <Route path="/dispatch/*" element={<Navigate to="/" replace />} />

      {/* ----- Finance (protégé) ----- */}
      <Route element={<ProtectedRoute allowedRoles={["FINANCE_MANAGER", "SUPER_ADMIN"]} redirectTo="/finance/login" />}>
        <Route path="/finance" element={<FinanceLayout />}>
          <Route index element={<FinanceHome />} />
          <Route path="livreurs" element={<LivreurBalancesPage />} />
          <Route path="expediteurs" element={<ExpediteurCodPage />} />
          <Route path="factures" element={<InvoicesPage_Finance />} />
          <Route path="rapports" element={<ReportsPage_Finance />} />
        </Route>
      </Route>
    </Routes>
  );
}
