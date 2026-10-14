// Purpose: Main React Router application with role-protected routes per Contract Section 9
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

// Layout & Core Pages
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

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
                    <PlaceholderPage title="Hardware Assets" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assets/new"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="Add New Asset" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assets/:id"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="Asset Detail" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assets/:id/edit"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="Edit Asset" />
                  </ProtectedRoute>
                }
              />

              {/* Personal Assets (All Roles) */}
              <Route path="my-assets" element={<PlaceholderPage title="My Assets" />} />

              {/* Software Licenses (ADMIN, IT_SUPPORT) */}
              <Route
                path="licenses"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="Software Licenses" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="licenses/new"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="Add New License" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="licenses/:id"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="License Detail" />
                  </ProtectedRoute>
                }
              />

              {/* Support Tickets (All Roles) */}
              <Route path="tickets" element={<PlaceholderPage title="Support Tickets" />} />
              <Route path="tickets/new" element={<PlaceholderPage title="Create Ticket" />} />
              <Route path="tickets/:id" element={<PlaceholderPage title="Ticket Detail" />} />

              {/* User Management (ADMIN Only) */}
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <PlaceholderPage title="User Management" />
                  </ProtectedRoute>
                }
              />

              {/* Compliance Audit Log (ADMIN Only) */}
              <Route
                path="audit"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <PlaceholderPage title="Audit Log Trail" />
                  </ProtectedRoute>
                }
              />

              {/* CSV Reports (ADMIN, IT_SUPPORT) */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={["ADMIN", "IT_SUPPORT"]}>
                    <PlaceholderPage title="Reports Export" />
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
