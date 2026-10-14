// Purpose: Main React Router application with complete role-protected routes per Contract Section 9
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

// Layout & Core Pages
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Hardware Assets Pages
import AssetList from "./pages/AssetList";
import AssetForm from "./pages/AssetForm";
import AssetDetail from "./pages/AssetDetail";
import MyAssets from "./pages/MyAssets";

// Software Licenses Pages
import LicenseList from "./pages/LicenseList";
import LicenseForm from "./pages/LicenseForm";
import LicenseDetail from "./pages/LicenseDetail";

// Support Tickets Pages
import TicketList from "./pages/TicketList";
import TicketForm from "./pages/TicketForm";
import TicketDetail from "./pages/TicketDetail";

// Administration & Audit Pages
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public authentication route */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated application shell routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<Dashboard />} />

              {/* Hardware Assets (ADMIN, IT_SUPPORT) */}
              <Route
                path="assets"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <AssetList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assets/new"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <AssetForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assets/:id"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <AssetDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assets/:id/edit"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <AssetForm />
                  </ProtectedRoute>
                }
              />

              {/* Personal Assets (All Roles) */}
              <Route path="my-assets" element={<MyAssets />} />

              {/* Software Licenses (ADMIN, IT_SUPPORT) */}
              <Route
                path="licenses"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <LicenseList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="licenses/new"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <LicenseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="licenses/:id"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <LicenseDetail />
                  </ProtectedRoute>
                }
              />

              {/* Support Tickets (All Roles) */}
              <Route path="tickets" element={<TicketList />} />
              <Route path="tickets/new" element={<TicketForm />} />
              <Route path="tickets/:id" element={<TicketDetail />} />

              {/* User Management (ADMIN Only) */}
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              {/* Compliance Audit Log (ADMIN Only) */}
              <Route
                path="audit"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              {/* CSV Reports (ADMIN, IT_SUPPORT) */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              {/* User Profile */}
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* 404 Catch-All Route */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
