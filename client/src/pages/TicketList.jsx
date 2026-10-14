// Purpose: Support tickets queue with status, priority, SLA overdue tracking, and role-based assignment filters
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getTickets } from "../api/tickets";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const CATEGORIES = ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"];

export default function TicketList() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });

  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const isStaff = user?.role === "ADMIN" || user?.role === "IT_SUPPORT";

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.q = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;
      if (isStaff && assignedTo) params.assignedTo = assignedTo;
      if (overdueOnly) params.overdue = "true";

      const res = await getTickets(params);
      setTickets(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      showToast(err.message || "Failed to load support tickets", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, category, assignedTo, overdueOnly, isStaff, showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setCategory("");
    setAssignedTo("");
    setOverdueOnly(false);
    setPage(1);
  };

  const isTicketOverdue = (row) => {
    if (!row.dueAt) return false;
    if (row.status === "RESOLVED" || row.status === "CLOSED") return false;
    return new Date(row.dueAt) < new Date();
  };

  const columns = [
    {
      header: "Ticket Code",
      key: "ticketCode",
      render: (val, row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Link to={`/tickets/${row._id}`} style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            {val}
          </Link>
          {isTicketOverdue(row) && (
            <span className="badge badge-danger" title="Resolution overdue past SLA">
              Overdue
            </span>
          )}
        </div>
      )
    },
    {
      header: "Title",
      key: "title",
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{val}</div>
          {row.createdBy && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)" }}>
              by {row.createdBy.name}
            </div>
          )}
        </div>
      )
    },
    {
      header: "Category",
      key: "category",
      render: (val) => <span className="badge badge-neutral">{val}</span>
    },
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
      header: "Assignee",
      key: "assignedTo",
      render: (val) =>
        val ? (
          <span style={{ fontWeight: 500 }}>{val.name}</span>
        ) : (
          <span style={{ color: "var(--color-text-subtle)", fontStyle: "italic" }}>Unassigned</span>
        )
    },
    {
      header: "SLA Due At",
      key: "dueAt",
      render: (val, row) => {
        if (!val) return "-";
        const overdue = isTicketOverdue(row);
        const dt = new Date(val);
        return (
          <span style={{ color: overdue ? "var(--color-danger)" : "inherit", fontWeight: overdue ? 700 : "normal" }}>
            {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      }
    },
    {
      header: "Actions",
      key: "_actions",
      render: (_, row) => (
        <Link to={`/tickets/${row._id}`} className="btn btn-secondary btn-sm">
          View
        </Link>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isStaff ? "Support Tickets Queue" : "My Support Requests"}</h1>
          <p className="page-subtitle">
            {isStaff
              ? "Triage, resolve, and monitor SLA compliance across IT helpdesk requests"
              : "Track progress and updates on your submitted support requests"}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/tickets/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Ticket
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-body">
          <form onSubmit={handleSearchSubmit} className="filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 200px", minWidth: "180px" }}
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="form-control"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

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

            {isStaff && (
              <select
                className="form-control"
                value={assignedTo}
                onChange={(e) => {
                  setAssignedTo(e.target.value);
                  setPage(1);
                }}
                style={{ width: "auto" }}
              >
                <option value="">All Staff</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>Overdue Only</span>
            </label>

            <button type="submit" className="btn btn-secondary">Search</button>
            {(search || status || priority || category || assignedTo || overdueOnly) && (
              <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ color: "var(--color-danger)" }}>
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={tickets}
            loading={loading}
            emptyTitle="No support tickets found"
            emptyDescription="There are no tickets matching your search and filter parameters."
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
