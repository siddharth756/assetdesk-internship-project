// Purpose: Software License Detail page with key reveal toggle, seat allocation table, and allocation modal
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLicenseById, allocateSeat, releaseSeat } from "../api/licenses";
import { lookupUsers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import FormField from "../components/FormField";
import Loader from "../components/Loader";

export default function LicenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [usersList, setUsersList] = useState([]);

  // Modals state
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [allocateLoading, setAllocateLoading] = useState(false);

  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const fetchLicense = useCallback(async () => {
    try {
      const data = await getLicenseById(id);
      setLicense(data);
    } catch (err) {
      showToast(err.message || "Failed to load license details", "error");
      navigate("/licenses");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const handleOpenAllocateModal = async () => {
    try {
      if (usersList.length === 0) {
        const users = await lookupUsers();
        setUsersList(users || []);
      }
      setSelectedUserId("");
      setShowAllocateModal(true);
    } catch (err) {
      showToast(err.message || "Failed to load employee list", "error");
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast("Please choose an employee to allocate the seat", "warning");
      return;
    }

    setAllocateLoading(true);
    try {
      await allocateSeat(id, selectedUserId);
      showToast("License seat allocated successfully", "success");
      setShowAllocateModal(false);
      fetchLicense();
    } catch (err) {
      showToast(err.message || "Failed to allocate seat", "error");
    } finally {
      setAllocateLoading(false);
    }
  };

  const handleReleaseConfirm = async () => {
    if (!releaseTarget) return;
    setReleaseLoading(true);
    try {
      await releaseSeat(id, releaseTarget.user._id);
      showToast(`Released seat from ${releaseTarget.user.name}`, "success");
      setReleaseTarget(null);
      fetchLicense();
    } catch (err) {
      showToast(err.message || "Failed to release seat", "error");
    } finally {
      setReleaseLoading(false);
    }
  };

  if (loading) {
    return <Loader text="Loading license details..." />;
  }

  if (!license) return null;

  const usedSeats = license.usedSeats ?? (license.allocations?.length || 0);
  const availableSeats = license.availableSeats ?? Math.max(0, license.totalSeats - usedSeats);
  const isFull = availableSeats <= 0;
  const isAdmin = user?.role === "ADMIN";

  // Build masked key representation
  const maskedKey = license.licenseKey
    ? license.licenseKey.length > 4
      ? `****-****-${license.licenseKey.slice(-4)}`
      : "****-****-****"
    : "****-****-****";

  const displayedKey = isAdmin && keyRevealed ? license.licenseKey : maskedKey;

  const allocationColumns = [
    {
      header: "Employee Name",
      key: "user",
      render: (u) => (
        <div>
          <strong style={{ color: "var(--color-text-main)" }}>{u?.name || "Unknown"}</strong>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)" }}>
            {u?.email || ""}
          </div>
        </div>
      )
    },
    {
      header: "Department",
      key: "user",
      render: (u) => u?.department || "General"
    },
    {
      header: "Allocated At",
      key: "allocatedAt",
      render: (val) => (val ? new Date(val).toLocaleDateString() : "-")
    },
    {
      header: "Actions",
      key: "_actions",
      render: (_, row) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ color: "var(--color-danger)" }}
          onClick={() => setReleaseTarget(row)}
        >
          Release Seat
        </button>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 className="page-title">{license.softwareName}</h1>
            <StatusBadge status={license.status} />
          </div>
          <p className="page-subtitle">
            Vendor: <strong>{license.vendor || "N/A"}</strong> · Expires: <strong>{new Date(license.expiryDate).toLocaleDateString()}</strong>
          </p>
        </div>
        <div className="page-actions" style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAllocateModal}
            disabled={isFull}
            title={isFull ? "All seats are currently allocated" : "Allocate seat to an employee"}
          >
            Allocate Seat
          </button>
        </div>
      </div>

      <div className="details-grid">
        <div>
          {/* License Metadata */}
          <div className="detail-card">
            <h2 className="detail-card-title">Subscription Specifications</h2>
            <div className="key-value-list">
              <div className="key-value-item">
                <span className="key-value-label">Software Name</span>
                <span className="key-value-val">{license.softwareName}</span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Vendor</span>
                <span className="key-value-val">{license.vendor || "N/A"}</span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Status</span>
                <span className="key-value-val"><StatusBadge status={license.status} /></span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Expiry Date</span>
                <span className="key-value-val">{new Date(license.expiryDate).toLocaleDateString()}</span>
              </div>
              <div className="key-value-item" style={{ gridColumn: "1 / -1" }}>
                <span className="key-value-label">License Key</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
                  <code style={{ fontSize: "var(--font-size-sm)", padding: "0.3rem 0.6rem", background: "#f1f5f9", borderRadius: "4px" }}>
                    {displayedKey}
                  </code>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setKeyRevealed((prev) => !prev)}
                    >
                      {keyRevealed ? "Hide Key" : "Reveal Key"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seat Allocations Table */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title">Active Seat Allocations ({usedSeats} / {license.totalSeats})</h2>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAllocateModal}
                disabled={isFull}
              >
                + Allocate
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={allocationColumns}
                data={license.allocations || []}
                keyField="_id"
                emptyTitle="No seat allocations"
                emptyDescription="No employees have been allocated a seat for this license subscription yet."
              />
            </div>
          </div>
        </div>

        <div>
          {/* Seat Capacity Gauge */}
          <div className="detail-card">
            <h2 className="detail-card-title">Seat Utilization</h2>
            <div className="seat-progress-container">
              <div className="seat-progress-label">
                <span>Allocated Seats: <strong>{usedSeats}</strong></span>
                <span>Available: <strong>{availableSeats}</strong></span>
              </div>
              <div className="seat-progress-track">
                <div
                  className={`seat-progress-fill ${isFull ? "full" : ""}`}
                  style={{ width: `${Math.min(100, (usedSeats / license.totalSeats) * 100)}%` }}
                />
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", marginTop: "0.25rem" }}>
                Total capacity: {license.totalSeats} seats
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Subscription Notes</h2>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-main)", whiteSpace: "pre-wrap" }}>
              {license.notes || <span style={{ color: "var(--color-text-subtle)", fontStyle: "italic" }}>No notes recorded for this license.</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Allocate Seat Modal */}
      {showAllocateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Allocate License Seat</h3>
              <button
                type="button"
                className="toast-close"
                onClick={() => setShowAllocateModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAllocateSubmit}>
              <div className="modal-body">
                <p style={{ marginBottom: "1rem" }}>
                  Allocate a software license seat for <strong>{license.softwareName}</strong> ({availableSeats} available).
                </p>
                <FormField label="Select Employee" id="seatUser" required>
                  <select
                    id="seatUser"
                    className="form-control"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {usersList.map((u) => {
                      const alreadyAllocated = license.allocations?.some(
                        (a) => (a.user?._id || a.user) === u._id
                      );
                      return (
                        <option key={u._id} value={u._id} disabled={alreadyAllocated}>
                          {u.name} ({u.email}) {alreadyAllocated ? "- (Already Allocated)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </FormField>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAllocateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={allocateLoading}>
                  {allocateLoading ? "Allocating..." : "Confirm Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Seat Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(releaseTarget)}
        title="Release License Seat"
        message={`Are you sure you want to release the seat allocated to ${releaseTarget?.user?.name}? This will free up 1 license seat.`}
        confirmText={releaseLoading ? "Releasing..." : "Release Seat"}
        danger
        onCancel={() => setReleaseTarget(null)}
        onConfirm={handleReleaseConfirm}
      />
    </div>
  );
}
