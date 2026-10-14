// Purpose: User profile page displaying account details and change-password form
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { changePassword } from "../api/auth";
import { extractErrorMessage } from "../api/http";
import FormField from "../components/FormField";
import StatusBadge from "../components/StatusBadge";

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs = {};
    if (!currentPassword) {
      errs.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      errs.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters long";
    } else if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errs.newPassword = "Password must contain at least one letter and one number";
    }

    if (newPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = extractErrorMessage(err);
      setErrors({ form: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View your account details and update your security credentials</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Account Details Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">User Account Information</h2>
          </div>
          <div className="card-body">
            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem" }}>{user?.name}</h3>
                <p className="form-hint">{user?.email}</p>
              </div>
            </div>

            <div className="profile-details-list">
              <div className="profile-detail-item">
                <span className="profile-detail-label">Full Name</span>
                <span className="profile-detail-val">{user?.name}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Email Address</span>
                <span className="profile-detail-val">{user?.email}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Assigned Role</span>
                <span className="profile-detail-val">
                  <StatusBadge status={user?.role} />
                </span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Department</span>
                <span className="profile-detail-val">{user?.department || "Unassigned"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Change Password</h2>
          </div>
          <div className="card-body">
            {errors.form && (
              <div className="form-error" style={{ marginBottom: "1rem" }} role="alert">
                {errors.form}
              </div>
            )}

            <form onSubmit={handlePasswordChange} noValidate>
              <FormField
                label="Current Password"
                id="currentPassword"
                error={errors.currentPassword}
                required
              >
                <input
                  id="currentPassword"
                  type="password"
                  className={`form-input ${errors.currentPassword ? "has-error" : ""}`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  disabled={submitting}
                  required
                />
              </FormField>

              <FormField
                label="New Password"
                id="newPassword"
                error={errors.newPassword}
                hint="Minimum 8 characters with at least one letter and one number"
                required
              >
                <input
                  id="newPassword"
                  type="password"
                  className={`form-input ${errors.newPassword ? "has-error" : ""}`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                id="confirmPassword"
                error={errors.confirmPassword}
                required
              >
                <input
                  id="confirmPassword"
                  type="password"
                  className={`form-input ${errors.confirmPassword ? "has-error" : ""}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                />
              </FormField>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ marginTop: "0.5rem" }}
              >
                {submitting ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
