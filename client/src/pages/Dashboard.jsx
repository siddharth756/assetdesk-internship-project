// Purpose: Role-aware dashboard page with KPI cards, CSS bar distribution lists, and recent activity tables
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../api/dashboard";
import { getExpiringLicenses } from "../api/licenses";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";
import Loader from "../components/Loader";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const sum = await getDashboardSummary();
        if (isMounted) setSummary(sum);

        if (user?.role !== "EMPLOYEE") {
          try {
            const exp = await getExpiringLicenses(30);
            if (isMounted) setExpiringLicenses(exp || []);
          } catch (e) {
            console.error("Expiring licenses load failed:", e.message);
          }
        }
      } catch (err) {
        console.error("Dashboard summary load failed:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  if (loading) {
    return <Loader text="Loading dashboard metrics..." />;
  }

  // Calculate percentages for bar lists
  const totalAssets = summary?.assetsTotal || 1;
  const assetStatusList = [
    { key: "AVAILABLE", label: "Available", count: summary?.assetsByStatus?.AVAILABLE || 0, color: "bar-fill-success" },
    { key: "ASSIGNED", label: "Assigned", count: summary?.assetsByStatus?.ASSIGNED || 0, color: "bar-fill-info" },
    { key: "MAINTENANCE", label: "Maintenance", count: summary?.assetsByStatus?.MAINTENANCE || 0, color: "bar-fill-warning" },
    { key: "RETIRED", label: "Retired", count: summary?.assetsByStatus?.RETIRED || 0, color: "bar-fill-neutral" }
  ];

  const totalTickets = Object.values(summary?.ticketsByStatus || {}).reduce((acc, c) => acc + c, 0) || 1;
  const ticketStatusList = [
    { key: "OPEN", label: "Open", count: summary?.ticketsByStatus?.OPEN || 0, color: "bar-fill-warning" },
    { key: "IN_PROGRESS", label: "In Progress", count: summary?.ticketsByStatus?.IN_PROGRESS || 0, color: "bar-fill-info" },
    { key: "RESOLVED", label: "Resolved", count: summary?.ticketsByStatus?.RESOLVED || 0, color: "bar-fill-success" },
    { key: "CLOSED", label: "Closed", count: summary?.ticketsByStatus?.CLOSED || 0, color: "bar-fill-neutral" }
  ];

  const recentTicketColumns = [
    {
      header: "Code",
      key: "ticketCode",
      render: (val, row) => (
        <Link to={`/tickets/${row._id}`} style={{ fontWeight: 600, color: "var(--color-primary)" }}>
          {val}
        </Link>
      )
    },
    { header: "Title", key: "title" },
    {
      header: "Priority",
      key: "priority",
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: "Status",
      key: "status",
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: "Due At",
      key: "dueAt",
      render: (val) => {
        if (!val) return "-";
        const date = new Date(val);
        const isPast = date < new Date();
        return (
          <span style={{ color: isPast ? "var(--color-danger)" : "inherit", fontWeight: isPast ? 600 : "normal" }}>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong>! Signed in as <StatusBadge status={user?.role} />
          </p>
        </div>
      </div>

      {user?.role !== "EMPLOYEE" ? (
        <>
          {/* KPI Cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-title">Total Hardware Assets</div>
              <div className="stat-card-value">{summary?.assetsTotal ?? 0}</div>
              <div className="stat-card-sub">
                {summary?.assetsByStatus?.AVAILABLE ?? 0} Available · {summary?.assetsByStatus?.ASSIGNED ?? 0} Assigned
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">Licenses Expiring (30d)</div>
              <div className="stat-card-value" style={{ color: "var(--color-warning)" }}>
                {summary?.licensesExpiring ?? 0}
              </div>
              <div className="stat-card-sub">{summary?.licensesExpired ?? 0} already expired</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">Open Tickets</div>
              <div className="stat-card-value">
                {(summary?.ticketsByStatus?.OPEN ?? 0) + (summary?.ticketsByStatus?.IN_PROGRESS ?? 0)}
              </div>
              <div className="stat-card-sub">
                {summary?.ticketsByStatus?.OPEN ?? 0} Open · {summary?.ticketsByStatus?.IN_PROGRESS ?? 0} In Progress
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">Overdue SLA Tickets</div>
              <div
                className="stat-card-value"
                style={{ color: (summary?.ticketsOverdue || 0) > 0 ? "var(--color-danger)" : "var(--color-success)" }}
              >
                {summary?.ticketsOverdue ?? 0}
              </div>
              <div className="stat-card-sub">Exceeded SLA resolution time</div>
            </div>
          </div>

          {/* Bar Lists: Assets and Tickets Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Assets by Status</h2>
              </div>
              <div className="card-body">
                <div className="bar-list">
                  {assetStatusList.map((item) => {
                    const pct = Math.round((item.count / totalAssets) * 100);
                    return (
                      <div key={item.key} className="bar-item">
                        <div className="bar-item-header">
                          <span>{item.label}</span>
                          <span className="bar-item-count">{item.count} ({pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className={`bar-fill ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Tickets by Status</h2>
              </div>
              <div className="card-body">
                <div className="bar-list">
                  {ticketStatusList.map((item) => {
                    const pct = Math.round((item.count / totalTickets) * 100);
                    return (
                      <div key={item.key} className="bar-item">
                        <div className="bar-item-header">
                          <span>{item.label}</span>
                          <span className="bar-item-count">{item.count} ({pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className={`bar-fill ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tickets Table */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title">Recent Support Tickets</h2>
              <Link to="/tickets" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={recentTicketColumns}
                data={summary?.recentTickets || []}
                emptyTitle="No recent tickets"
                emptyDescription="There are no active tickets recorded in the system."
              />
            </div>
          </div>

          {/* Expiring Licenses List */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title">Licenses Expiring Within 30 Days</h2>
              <Link to="/licenses" className="btn btn-secondary btn-sm">Manage Licenses</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={[
                  {
                    header: "Software Name",
                    key: "softwareName",
                    render: (val, row) => (
                      <Link to={`/licenses/${row._id}`} style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                        {val}
                      </Link>
                    )
                  },
                  { header: "Vendor", key: "vendor" },
                  {
                    header: "Expiry Date",
                    key: "expiryDate",
                    render: (val) => val ? new Date(val).toLocaleDateString() : "-"
                  },
                  {
                    header: "Days Left",
                    key: "daysLeft",
                    render: (val) => (
                      <span className="badge badge-warning">{val !== undefined ? `${val} days` : "Soon"}</span>
                    )
                  },
                  {
                    header: "Seats",
                    key: "totalSeats",
                    render: (_, row) => `${row.allocations?.length || 0} / ${row.totalSeats}`
                  }
                ]}
                data={expiringLicenses}
                emptyTitle="No expiring licenses"
                emptyDescription="All active software licenses are outside the 30-day expiry threshold."
              />
            </div>
          </div>

          {/* Recent Audit (Admin only) */}
          {user?.role === "ADMIN" && summary?.recentAudit && (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="card-title">Recent System Audit Trail</h2>
                <Link to="/audit" className="btn btn-secondary btn-sm">View All Logs</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <DataTable
                  columns={[
                    {
                      header: "Timestamp",
                      key: "createdAt",
                      render: (val) => new Date(val).toLocaleString()
                    },
                    { header: "User", key: "userName" },
                    {
                      header: "Action",
                      key: "action",
                      render: (val) => <span className="badge badge-neutral">{val}</span>
                    },
                    { header: "Entity", key: "entity" },
                    { header: "Details", key: "details" }
                  ]}
                  data={summary.recentAudit}
                  emptyTitle="No audit records"
                  emptyDescription="No recent audit events logged."
                />
              </div>
            </div>
          )}
        </>
      ) : (
        /* Employee Dashboard */
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-title">My Assigned Assets</div>
              <div className="stat-card-value">{summary?.myAssetsCount ?? 0}</div>
              <div className="stat-card-sub">Hardware devices in your possession</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-title">My Active Tickets</div>
              <div className="stat-card-value">{summary?.myOpenTickets ?? 0}</div>
              <div className="stat-card-sub">Requests currently open or in progress</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title">My Recent Support Requests</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link to="/tickets/new" className="btn btn-primary btn-sm">+ New Ticket</Link>
                <Link to="/tickets" className="btn btn-secondary btn-sm">View All</Link>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={recentTicketColumns}
                data={summary?.myRecentTickets || []}
                emptyTitle="No tickets filed yet"
                emptyDescription="You haven't submitted any support requests yet. Click '+ New Ticket' if you need assistance."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
