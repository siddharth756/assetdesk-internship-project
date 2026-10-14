// Purpose: Compliance audit trail page for administrators with action, entity, date range filters and details viewing
import { useState, useEffect, useCallback } from "react";
import { getAuditLogs } from "../api/audit";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";

const ENTITIES = ["AUTH", "USER", "ASSET", "LICENSE", "TICKET"];
const ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_STATUS",
  "PASSWORD_CHANGE",
  "ASSET_CREATE",
  "ASSET_UPDATE",
  "ASSET_ASSIGN",
  "ASSET_UNASSIGN",
  "ASSET_STATUS",
  "LICENSE_CREATE",
  "LICENSE_UPDATE",
  "LICENSE_ALLOCATE",
  "LICENSE_RELEASE",
  "LICENSE_EXPIRY_ALERT",
  "TICKET_CREATE",
  "TICKET_ASSIGN",
  "TICKET_STATUS",
  "TICKET_COMMENT",
  "REPORT_EXPORT"
];

export default function AuditLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0 });

  // Filters state
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (entity) params.entity = entity;
      if (action) params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await getAuditLogs(params);
      setLogs(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      showToast(err.message || "Failed to load audit trail", "error");
    } finally {
      setLoading(false);
    }
  }, [page, entity, action, from, to, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setEntity("");
    setAction("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const columns = [
    {
      header: "Timestamp",
      key: "createdAt",
      render: (val) => (
        <span style={{ fontSize: "var(--font-size-xs)", whiteSpace: "nowrap" }}>
          {new Date(val).toLocaleString()}
        </span>
      )
    },
    {
      header: "Actor",
      key: "userName",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val || "System"}</div>
          {row.user?.email && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)" }}>
              {row.user.email}
            </div>
          )}
        </div>
      )
    },
    {
      header: "Entity",
      key: "entity",
      render: (val) => <span className="badge badge-primary">{val}</span>
    },
    {
      header: "Action",
      key: "action",
      render: (val) => <span className="badge badge-neutral">{val}</span>
    },
    {
      header: "Activity Details",
      key: "details",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{val}</div>
          {row.entityId && (
            <div style={{ marginTop: "0.2rem" }}>
              <code className="audit-details-code">ID: {row.entityId}</code>
            </div>
          )}
        </div>
      )
    },
    {
      header: "IP Address",
      key: "ip",
      render: (val) => (
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", fontFamily: "monospace" }}>
          {val || "-"}
        </span>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance Audit Trail</h1>
          <p className="page-subtitle">
            Immutable, append-only security logs for user authentication, asset allocations, and ticket events
          </p>
        </div>
      </div>

      {/* Filter and Date Range Bar */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <select
              className="form-control"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Entities</option>
              {ENTITIES.map((ent) => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>

            <select
              className="form-control"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Actions</option>
              {ACTIONS.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>From:</span>
              <input
                type="date"
                className="form-control"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                style={{ width: "auto" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>To:</span>
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                style={{ width: "auto" }}
              />
            </div>

            {(entity || action || from || to) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
                style={{ color: "var(--color-danger)" }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            emptyTitle="No audit records"
            emptyDescription="No events match the selected entity, action, or date range."
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
