// Purpose: Hardware Assets inventory list page with search, filters, pagination, and quick actions
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAssets } from "../api/assets";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";

const CATEGORIES = ["LAPTOP", "DESKTOP", "MONITOR", "PRINTER", "NETWORK", "MOBILE", "OTHER"];
const STATUSES = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"];

export default function AssetList() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });

  // Filters state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [assigned, setAssigned] = useState("");
  const [page, setPage] = useState(1);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.q = search.trim();
      if (category) params.category = category;
      if (status) params.status = status;
      if (assigned) params.assigned = assigned;

      const res = await getAssets(params);
      setAssets(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      showToast(err.message || "Failed to load assets", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status, assigned, showToast]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setAssigned("");
    setPage(1);
  };

  const columns = [
    {
      header: "Asset Tag",
      key: "assetTag",
      render: (val, row) => (
        <Link to={`/assets/${row._id}`} style={{ fontWeight: 600, color: "var(--color-primary)" }}>
          {val}
        </Link>
      )
    },
    { header: "Name / Model", key: "name" },
    {
      header: "Category",
      key: "category",
      render: (val) => <span className="badge badge-neutral">{val}</span>
    },
    {
      header: "Status",
      key: "status",
      render: (val) => <StatusBadge status={val} />
    },
    { header: "Serial Number", key: "serialNumber" },
    {
      header: "Assigned To",
      key: "assignedTo",
      render: (val) =>
        val ? (
          <div>
            <div style={{ fontWeight: 600 }}>{val.name}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)" }}>
              {val.email}
            </div>
          </div>
        ) : (
          <span style={{ color: "var(--color-text-subtle)", fontStyle: "italic" }}>Unassigned</span>
        )
    },
    {
      header: "Actions",
      key: "_actions",
      render: (_, row) => (
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <Link to={`/assets/${row._id}`} className="btn btn-secondary btn-sm" title="View Details">
            View
          </Link>
          <Link to={`/assets/${row._id}/edit`} className="btn btn-secondary btn-sm" title="Edit Asset">
            Edit
          </Link>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hardware Assets</h1>
          <p className="page-subtitle">Track, inventory, and manage organizational devices</p>
        </div>
        <div className="page-actions">
          <Link to="/assets/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Asset
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
              placeholder="Search by tag, serial, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 220px", minWidth: "200px" }}
            />

            <select
              className="form-control"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

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
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="form-control"
              value={assigned}
              onChange={(e) => {
                setAssigned(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Assignments</option>
              <option value="true">Assigned</option>
              <option value="false">Unassigned</option>
            </select>

            <button type="submit" className="btn btn-secondary">Search</button>
            {(search || category || status || assigned) && (
              <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ color: "var(--color-danger)" }}>
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Assets Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={assets}
            loading={loading}
            emptyTitle="No hardware assets found"
            emptyDescription="No assets match your search and filter criteria. Adjust your filters or add a new asset."
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
