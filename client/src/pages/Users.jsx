// Purpose: User management administration page with search, role filters, create/edit modal, and self-protection checks
import { useState, useEffect, useCallback } from "react";
import { getUsers, createUser, updateUser, updateUserStatus } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import ConfirmDialog from "../components/ConfirmDialog";
import FormField from "../components/FormField";

const ROLES = ["ADMIN", "IT_SUPPORT", "EMPLOYEE"];

export default function Users() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });

  // Filters state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: ""
  });

  // Status toggle confirmation
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusToggling, setStatusToggling] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.q = search.trim();
      if (roleFilter) params.role = roleFilter;

      const res = await getUsers(params);
      setUsers(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      showToast(err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
      department: ""
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (targetUser) => {
    setEditingUser(targetUser);
    setFormData({
      name: targetUser.name || "",
      email: targetUser.email || "",
      password: "",
      role: targetUser.role || "EMPLOYEE",
      department: targetUser.department || ""
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Full name is required";
    if (!formData.email.trim()) errs.email = "Email address is required";
    if (!editingUser) {
      if (!formData.password) {
        errs.password = "Password is required for new accounts";
      } else if (formData.password.length < 8) {
        errs.password = "Password must be at least 8 characters";
      } else if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
        errs.password = "Password must contain at least one letter and one number";
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setModalSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser._id, {
          name: formData.name.trim(),
          role: formData.role,
          department: formData.department.trim()
        });
        showToast("User details updated successfully", "success");
      } else {
        await createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          department: formData.department.trim()
        });
        showToast("User created successfully", "success");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err.status === 409 || err.message?.toLowerCase().includes("email")) {
        setFormErrors((prev) => ({ ...prev, email: "This email address is already registered" }));
      } else if (err.details && Array.isArray(err.details)) {
        const srvErrors = {};
        err.details.forEach((d) => {
          if (d.field) srvErrors[d.field] = d.message;
        });
        setFormErrors((prev) => ({ ...prev, ...srvErrors }));
      }
      showToast(err.message || "Failed to save user", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!statusTarget) return;
    setStatusToggling(true);
    try {
      const nextStatus = !statusTarget.isActive;
      await updateUserStatus(statusTarget._id, nextStatus);
      showToast(
        `User ${statusTarget.name} has been ${nextStatus ? "activated" : "deactivated"}`,
        "success"
      );
      setStatusTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message || "Failed to update user status", "error");
    } finally {
      setStatusToggling(false);
    }
  };

  const columns = [
    {
      header: "Full Name",
      key: "name",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          {row._id === currentUser?._id && (
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
              (You)
            </span>
          )}
        </div>
      )
    },
    { header: "Email Address", key: "email" },
    {
      header: "Role",
      key: "role",
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: "Department",
      key: "department",
      render: (val) => val || "General"
    },
    {
      header: "Status",
      key: "isActive",
      render: (val) => (
        <span className={`badge ${val ? "badge-success" : "badge-danger"}`}>
          {val ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      header: "Actions",
      key: "_actions",
      render: (_, row) => {
        const isSelf = row._id === currentUser?._id;
        return (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEdit(row)}
            >
              Edit
            </button>
            <button
              type="button"
              className={`btn btn-sm ${row.isActive ? "btn-secondary" : "btn-primary"}`}
              style={row.isActive ? { color: "var(--color-danger)" } : {}}
              onClick={() => setStatusTarget(row)}
              disabled={isSelf}
              title={isSelf ? "Cannot deactivate your own account" : row.isActive ? "Deactivate User" : "Activate User"}
            >
              {row.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage organizational accounts, roles, and access credentials</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body">
          <form onSubmit={handleSearchSubmit} className="filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 240px", minWidth: "200px" }}
            />

            <select
              className="form-control"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <button type="submit" className="btn btn-secondary">Search</button>
            {(search || roleFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("");
                  setPage(1);
                }}
                className="btn btn-secondary"
                style={{ color: "var(--color-danger)" }}
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            emptyTitle="No users found"
            emptyDescription="No employee accounts match the specified criteria."
          />
        </div>
        {!loading && meta.total > 0 && (
          <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--color-border)" }}>
            <Pagination
              currentPage={meta.page}
              totalPages={Math.ceil(meta.total / meta.limit)}
              onPageChange={(p) => setPage(p)}
              totalItems={meta.total}
              pageSize={meta.limit}
            />
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? `Edit User: ${editingUser.name}` : "Create New User Account"}
              </h3>
              <button
                type="button"
                className="toast-close"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleModalSubmit} noValidate>
              <div className="modal-body">
                <FormField label="Full Name" id="name" required error={formErrors.name}>
                  <input
                    type="text"
                    id="name"
                    className={`form-control ${formErrors.name ? "error" : ""}`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={modalSubmitting}
                  />
                </FormField>

                <FormField label="Email Address" id="email" required error={formErrors.email}>
                  <input
                    type="email"
                    id="email"
                    className={`form-control ${formErrors.email ? "error" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={modalSubmitting || Boolean(editingUser)}
                  />
                </FormField>

                {!editingUser && (
                  <FormField
                    label="Initial Password"
                    id="password"
                    required
                    error={formErrors.password}
                    hint="Minimum 8 characters with at least one letter and one number"
                  >
                    <input
                      type="password"
                      id="password"
                      className={`form-control ${formErrors.password ? "error" : ""}`}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={modalSubmitting}
                    />
                  </FormField>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <FormField label="Role" id="role" required>
                    <select
                      id="role"
                      className="form-control"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      disabled={modalSubmitting || (editingUser && editingUser._id === currentUser?._id)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Department" id="department">
                    <input
                      type="text"
                      id="department"
                      className="form-control"
                      placeholder="e.g. Engineering, QA"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      disabled={modalSubmitting}
                    />
                  </FormField>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? "Saving..." : editingUser ? "Update User" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.isActive ? "Deactivate User Account" : "Activate User Account"}
        message={
          statusTarget?.isActive
            ? `Are you sure you want to deactivate ${statusTarget?.name} (${statusTarget?.email})? They will be prevented from logging in.`
            : `Are you sure you want to activate ${statusTarget?.name} (${statusTarget?.email})? They will regain access to the system.`
        }
        confirmText={statusToggling ? "Processing..." : statusTarget?.isActive ? "Deactivate" : "Activate"}
        danger={statusTarget?.isActive}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleToggleStatusConfirm}
      />
    </div>
  );
}
