// Purpose: User login page with form validation and demo credentials helper
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { extractErrorMessage } from "../api/http";
import FormField from "../components/FormField";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const showDemo = import.meta.env.VITE_SHOW_DEMO === "true";

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function validateForm() {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Logged in successfully");
      navigate("/");
    } catch (err) {
      const msg = extractErrorMessage(err);
      setErrors({ form: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword("Demo@1234");
    setErrors({});
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">A</div>
          <h1 className="login-title">AssetDesk</h1>
          <p className="login-subtitle">Sign in to manage IT assets & support tickets</p>
        </div>

        {errors.form && (
          <div className="form-error" style={{ marginBottom: "1rem", justifyContent: "center" }} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Email Address" id="email" error={errors.email} required>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? "has-error" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@assetdesk.local"
              autoComplete="email"
              disabled={submitting}
              required
            />
          </FormField>

          <FormField label="Password" id="password" error={errors.password} required>
            <input
              id="password"
              type="password"
              className={`form-input ${errors.password ? "has-error" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={submitting}
              required
            />
          </FormField>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {showDemo && (
          <div className="demo-credentials">
            <h4>Demo Accounts (Password: Demo@1234)</h4>
            <div>
              <button
                type="button"
                className="demo-badge-btn"
                onClick={() => fillDemo("admin@assetdesk.local")}
              >
                ADMIN
              </button>
              <button
                type="button"
                className="demo-badge-btn"
                onClick={() => fillDemo("support1@assetdesk.local")}
              >
                IT SUPPORT
              </button>
              <button
                type="button"
                className="demo-badge-btn"
                onClick={() => fillDemo("emp1@assetdesk.local")}
              >
                EMPLOYEE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
