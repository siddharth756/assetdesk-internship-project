// Purpose: Authentication context provider and ProtectedRoute component for RBAC
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { login as apiLogin, getMe as apiGetMe } from "../api/auth";

const TOKEN_KEY = "assetdesk_token";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on initial load
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await apiGetMe();
        setUser(currentUser);
      } catch (err) {
        console.error("Session restoration failed:", err.message);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    token,
    user,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(token && user)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * ProtectedRoute component requiring authentication and optional role authorization
 * @param {Object} props
 * @param {Array<string>} [props.roles] - Allowed roles (e.g. ['ADMIN', 'IT_SUPPORT'])
 * @param {React.ReactNode} props.children
 */
export function ProtectedRoute({ roles, children }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="loader-container" role="status" aria-label="Loading session">
        <div className="spinner"></div>
        <span>Verifying authentication...</span>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && Array.isArray(roles) && !roles.includes(user.role)) {
    return (
      <div className="status-page" role="alert">
        <div className="status-code">403</div>
        <h2>Access Not Allowed</h2>
        <p className="form-hint" style={{ maxWidth: "420px", margin: "0.5rem auto 1.5rem auto" }}>
          You do not have permission to view this page. This section requires{" "}
          <strong>{roles.join(" or ")}</strong> privileges, but your current account role is{" "}
          <span className="badge badge-neutral">{user.role}</span>.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return children;
}
