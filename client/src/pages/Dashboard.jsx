// Purpose: Dashboard summary page displaying role-aware metrics and quick overview
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../api/dashboard";
import StatusBadge from "../components/StatusBadge";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        if (isMounted) setSummary(data);
      } catch (err) {
        console.error("Dashboard summary load failed:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong>! You are signed in as{" "}
            <StatusBadge status={user?.role} />
          </p>
        </div>
      </div>

      {loading ? (
        <Loader text="Loading dashboard statistics..." />
      ) : summary ? (
        <>
          {/* Admin / Support View */}
          {user?.role !== "EMPLOYEE" && (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-title">Total Hardware Assets</div>
                <div className="stat-card-value">{summary.assetsTotal ?? 0}</div>
                <div className="stat-card-sub">
                  {summary.assetsByStatus?.AVAILABLE ?? 0} Available ·{" "}
                  {summary.assetsByStatus?.ASSIGNED ?? 0} Assigned
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-title">Software Licenses Expiring</div>
                <div className="stat-card-value" style={{ color: "var(--color-warning)" }}>
                  {summary.licensesExpiring ?? 0}
                </div>
                <div className="stat-card-sub">
                  {summary.licensesExpired ?? 0} already expired
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-title">Support Tickets</div>
                <div className="stat-card-value">
                  {(summary.ticketsByStatus?.OPEN ?? 0) + (summary.ticketsByStatus?.IN_PROGRESS ?? 0)}
                </div>
                <div className="stat-card-sub">
                  {summary.ticketsByStatus?.OPEN ?? 0} Open ·{" "}
                  {summary.ticketsByStatus?.IN_PROGRESS ?? 0} In Progress
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-title">Overdue SLA Tickets</div>
                <div
                  className="stat-card-value"
                  style={{ color: summary.ticketsOverdue > 0 ? "var(--color-danger)" : "var(--color-success)" }}
                >
                  {summary.ticketsOverdue ?? 0}
                </div>
                <div className="stat-card-sub">SLA deadline exceeded</div>
              </div>
            </div>
          )}

          {/* Employee View */}
          {user?.role === "EMPLOYEE" && (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-title">My Assigned Assets</div>
                <div className="stat-card-value">{summary.myAssetsCount ?? 0}</div>
                <div className="stat-card-sub">Devices registered to your name</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-title">My Active Tickets</div>
                <div className="stat-card-value">{summary.myOpenTickets ?? 0}</div>
                <div className="stat-card-sub">Open and in-progress requests</div>
              </div>
            </div>
          )}

          {/* Quick Info Card */}
          <div className="card" style={{ marginTop: "1rem" }}>
            <div className="card-header">
              <h2 className="card-title">System Status & Role Scoping</h2>
            </div>
            <div className="card-body">
              <p>
                Connected as <strong>{user?.name}</strong> ({user?.email}) with role{" "}
                <StatusBadge status={user?.role} /> in department <strong>{user?.department || "General"}</strong>.
              </p>
              <p style={{ marginTop: "0.5rem" }} className="form-hint">
                All module pages (Assets, Licenses, Tickets, Users, Audit, Reports) will be fully interactable in Part 8.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body">
            <p>Welcome, <strong>{user?.name}</strong> ({user?.role})</p>
          </div>
        </div>
      )}
    </div>
  );
}
