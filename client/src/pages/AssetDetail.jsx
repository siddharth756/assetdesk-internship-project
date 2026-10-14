// Purpose: Hardware Asset Detail page with assignment, unassignment, status change modals, and audit details
import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAssetById, assignAsset, unassignAsset, updateAssetStatus } from "../api/assets";
import { lookupUsers } from "../api/users";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import FormField from "../components/FormField";
import Loader from "../components/Loader";

const STATUS_OPTIONS = ["AVAILABLE", "MAINTENANCE", "RETIRED"];

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [unassignLoading, setUnassignLoading] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchAsset = useCallback(async () => {
    try {
      const data = await getAssetById(id);
      setAsset(data);
      setSelectedStatus(data.status);
    } catch (err) {
      showToast(err.message || "Failed to load asset", "error");
      navigate("/assets");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  // Load user lookup list on opening assign modal
  const handleOpenAssignModal = async () => {
    try {
      if (usersList.length === 0) {
        const users = await lookupUsers();
        setUsersList(users || []);
      }
      setSelectedUserId("");
      setShowAssignModal(true);
    } catch (err) {
      showToast(err.message || "Failed to load user directory", "error");
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast("Please select a user to assign this asset", "warning");
      return;
    }
    setAssignLoading(true);
    try {
      await assignAsset(id, selectedUserId);
      showToast("Asset assigned successfully", "success");
      setShowAssignModal(false);
      fetchAsset();
    } catch (err) {
      showToast(err.message || "Failed to assign asset", "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignConfirm = async () => {
    setUnassignLoading(true);
    try {
      await unassignAsset(id);
      showToast("Asset unassigned successfully", "success");
      setShowUnassignDialog(false);
      fetchAsset();
    } catch (err) {
      showToast(err.message || "Failed to unassign asset", "error");
    } finally {
      setUnassignLoading(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;
    setStatusLoading(true);
    try {
      await updateAssetStatus(id, selectedStatus);
      showToast(`Asset status changed to ${selectedStatus}`, "success");
      setShowStatusModal(false);
      fetchAsset();
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return <Loader text="Loading asset specifications..." />;
  }

  if (!asset) {
    return null;
  }

  const isAssigned = Boolean(asset.assignedTo);
  const isAvailable = asset.status === "AVAILABLE";

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 className="page-title">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="page-subtitle">
            Asset Tag: <strong style={{ color: "var(--color-primary)" }}>{asset.assetTag}</strong> · Serial Number: <strong>{asset.serialNumber}</strong>
          </p>
        </div>
        <div className="page-actions" style={{ display: "flex", gap: "0.5rem" }}>
          <Link to={`/assets/${id}/edit`} className="btn btn-secondary">
            Edit
          </Link>

          {/* Assign / Unassign Buttons */}
          {isAssigned ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowUnassignDialog(true)}
            >
              Unassign
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAssignModal}
              disabled={!isAvailable}
              title={!isAvailable ? "Only AVAILABLE assets can be assigned" : "Assign asset to employee"}
            >
              Assign
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowStatusModal(true)}
          >
            Change Status
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="details-grid">
        <div>
          {/* Hardware Specifications */}
          <div className="detail-card">
            <h2 className="detail-card-title">Device Specifications</h2>
            <div className="key-value-list">
              <div className="key-value-item">
                <span className="key-value-label">Asset Tag</span>
                <span className="key-value-val">{asset.assetTag}</span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Make & Model</span>
                <span className="key-value-val">{asset.name}</span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Serial Number</span>
                <span className="key-value-val">{asset.serialNumber}</span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Category</span>
                <span className="key-value-val">
                  <span className="badge badge-neutral">{asset.category}</span>
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Current Status</span>
                <span className="key-value-val">
                  <StatusBadge status={asset.status} />
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Purchase Date</span>
                <span className="key-value-val">
                  {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "Not specified"}
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Warranty Expiry</span>
                <span className="key-value-val">
                  {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : "Not specified"}
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Created At</span>
                <span className="key-value-val">{new Date(asset.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Inventory Notes & Remarks</h2>
            <div style={{ color: "var(--color-text-main)", fontSize: "var(--font-size-sm)", whiteSpace: "pre-wrap" }}>
              {asset.notes || <span style={{ color: "var(--color-text-subtle)", fontStyle: "italic" }}>No notes recorded for this asset.</span>}
            </div>
          </div>
        </div>

        <div>
          {/* Current Assignment Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Assignment Information</h2>
            {asset.assignedTo ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700
                    }}
                  >
                    {asset.assignedTo.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>
                      {asset.assignedTo.name}
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                      {asset.assignedTo.email}
                    </div>
                  </div>
                </div>

                <div className="key-value-list" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="key-value-item">
                    <span className="key-value-label">Department</span>
                    <span className="key-value-val">{asset.assignedTo.department || "General"}</span>
                  </div>
                  <div className="key-value-item">
                    <span className="key-value-label">Assigned Status</span>
                    <span className="key-value-val"><StatusBadge status="ASSIGNED" /></span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "1rem", width: "100%" }}
                  onClick={() => setShowUnassignDialog(true)}
                >
                  Unassign Asset
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <p style={{ color: "var(--color-text-subtle)", fontSize: "var(--font-size-sm)", marginBottom: "1rem" }}>
                  This device is currently unassigned.
                </p>
                {isAvailable ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenAssignModal}
                  >
                    Assign to Employee
                  </button>
                ) : (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-warning)" }}>
                    Asset must be in AVAILABLE status to assign.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Life-Cycle Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Life-Cycle Status</h2>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              Only AVAILABLE assets can be assigned. Switching status to MAINTENANCE or RETIRED unassigns the device automatically.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: "100%" }}
              onClick={() => setShowStatusModal(true)}
            >
              Change Life-Cycle Status
            </button>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Assign Asset: {asset.assetTag}</h3>
              <button
                type="button"
                className="toast-close"
                onClick={() => setShowAssignModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                <p style={{ marginBottom: "1rem" }}>
                  Select an employee to allocate this <strong>{asset.name}</strong> ({asset.serialNumber}).
                </p>
                <FormField label="Assign to Employee" id="assignee" required>
                  <select
                    id="assignee"
                    className="form-control"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose User --</option>
                    {usersList.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) - {u.department || u.role}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignLoading}>
                  {assignLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unassign Confirm Dialog */}
      <ConfirmDialog
        isOpen={showUnassignDialog}
        title="Unassign Hardware Asset"
        message={`Are you sure you want to unassign ${asset.name} (${asset.assetTag}) from ${asset.assignedTo?.name}? The asset will become AVAILABLE.`}
        confirmText={unassignLoading ? "Unassigning..." : "Unassign Asset"}
        danger
        onCancel={() => setShowUnassignDialog(false)}
        onConfirm={handleUnassignConfirm}
      />

      {/* Change Status Modal */}
      {showStatusModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Change Asset Status: {asset.assetTag}</h3>
              <button
                type="button"
                className="toast-close"
                onClick={() => setShowStatusModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleStatusSubmit}>
              <div className="modal-body">
                <FormField label="Target Status" id="status" required>
                  <select
                    id="status"
                    className="form-control"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </FormField>
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", marginTop: "0.5rem" }}>
                  Warning: Setting status to MAINTENANCE or RETIRED will automatically clear any current user assignment.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={statusLoading}>
                  {statusLoading ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
