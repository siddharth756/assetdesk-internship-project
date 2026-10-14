// Purpose: Software Licenses management list page with seat utilization, days left, and status filters
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getLicenses } from "../api/licenses";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";

export default function LicenseList() {
  const { showToast } = useToast();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });

  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.q = search.trim();
      if (status) params.status = status;

      const res = await getLicenses(params);
      setLicenses(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      showToast(err.message || "Failed to load software licenses", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, showToast]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLicenses();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const calculateDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const diffMs = new Date(expiryDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const columns = [
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
      header: "Status",
      key: "status",
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: "License Key",
      key: "licenseKey",
      render: (val) => <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)" }}>{val}</span>
    },
    {
      header: "Seats (Used / Total)",
      key: "totalSeats",
      render: (total, row) => {
        const used = row.usedSeats ?? (row.allocations?.length || 0);
        const pct = Math.min(100, Math.round((used / total) * 100));
        const isFull = used >= total;
        return (
          <div style={{ minWidth: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "0.2rem" }}>
              <span>{used} / {total}</span>
              <span style={{ fontWeight: 600 }}>{pct}%</span>
            </div>
            <div className="seat-progress-track">
              <div
                className={`seat-progress-fill ${isFull ? "full" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: "Expiry Date",
      key: "expiryDate",
      render: (val) => (val ? new Date(val).toLocaleDateString() : "-")
    },
    {
      header: "Days Left",
      key: "_daysLeft",
      render: (_, row) => {
        const days = calculateDaysLeft(row.expiryDate);
        if (days === null) return "-";
        if (days < 0) {
          return <span className="badge badge-danger">Expired</span>;
        }
        if (days <= 30) {
          return <span className="badge badge-warning">{days} days left</span>;
        }
        return <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{days} days</span>;
      }
    },
    {
      header: "Actions",
      key: "_actions",
      render: (_, row) => (
        <Link to={`/licenses/${row._id}`} className="btn btn-secondary btn-sm">
          View
        </Link>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Software Licenses</h1>
          <p className="page-subtitle">Track license subscriptions, seat allocations, and renewals</p>
        </div>
        <div className="page-actions">
          <Link to="/licenses/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add License
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body">
          <form onSubmit={handleSearchSubmit} className="filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by software name or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 240px", minWidth: "200px" }}
            />

            <select
              className="form-control"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRING">EXPIRING (&lt; 30 days)</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>

            <button type="submit" className="btn btn-secondary">Search</button>
            {(search || status) && (
              <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ color: "var(--color-danger)" }}>
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={licenses}
            loading={loading}
            emptyTitle="No software licenses found"
            emptyDescription="No license subscriptions match your search and filter criteria."
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
    </div>
  );
}
