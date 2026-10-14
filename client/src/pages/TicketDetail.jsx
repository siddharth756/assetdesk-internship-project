// Purpose: Support Ticket Detail page with SLA status, comments thread, staff assignment/status controls, and employee reopen
import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTicketById, assignTicket, updateTicketStatus, addTicketComment } from "../api/tickets";
import { lookupUsers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import FormField from "../components/FormField";
import Loader from "../components/Loader";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffUsers, setStaffUsers] = useState([]);

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Staff action states
  const [assigneeId, setAssigneeId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [statusVal, setStatusVal] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const isStaff = user?.role === "ADMIN" || user?.role === "IT_SUPPORT";

  const fetchTicket = useCallback(async () => {
    try {
      const data = await getTicketById(id);
      setTicket(data);
      setStatusVal(data.status);
      setAssigneeId(data.assignedTo?._id || "");
    } catch (err) {
      showToast(err.message || "Failed to load ticket details", "error");
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (!isStaff) return;
    let isMounted = true;
    async function loadStaff() {
      try {
        const users = await lookupUsers();
        if (isMounted) {
          // Filter to staff roles for assignment
          const staff = (users || []).filter((u) => u.role === "ADMIN" || u.role === "IT_SUPPORT");
          setStaffUsers(staff);
        }
      } catch (err) {
        console.error("Staff lookup failed:", err.message);
      }
    }
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, [isStaff]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentSubmitting(true);
    try {
      const updated = await addTicketComment(id, commentText.trim());
      setTicket(updated);
      setCommentText("");
      showToast("Comment posted successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to post comment", "error");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assigneeId) {
      showToast("Please choose a staff member to assign", "warning");
      return;
    }

    setAssignLoading(true);
    try {
      const updated = await assignTicket(id, assigneeId);
      setTicket(updated);
      setStatusVal(updated.status);
      showToast("Ticket assigned successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to assign ticket", "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!statusVal || statusVal === ticket.status) return;

    if (statusVal === "RESOLVED" && (!resolutionNote.trim() || resolutionNote.trim().length < 5)) {
      showToast("Resolution note must be at least 5 characters to resolve ticket", "warning");
      return;
    }

    setStatusLoading(true);
    try {
      const updated = await updateTicketStatus(id, statusVal, resolutionNote.trim());
      setTicket(updated);
      setResolutionNote("");
      showToast(`Ticket status updated to ${statusVal}`, "success");
    } catch (err) {
      showToast(err.message || "Status transition failed", "error");
      setStatusVal(ticket.status);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    setStatusLoading(true);
    try {
      const updated = await updateTicketStatus(id, "IN_PROGRESS", "Reopened by requester");
      setTicket(updated);
      setStatusVal("IN_PROGRESS");
      showToast("Ticket reopened and set back to IN_PROGRESS", "success");
    } catch (err) {
      showToast(err.message || "Failed to reopen ticket", "error");
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return <Loader text="Loading support ticket..." />;
  }

  if (!ticket) return null;

  const isClosed = ticket.status === "CLOSED";
  const isResolved = ticket.status === "RESOLVED";
  const isOverdue =
    !isClosed && !isResolved && ticket.dueAt && new Date(ticket.dueAt) < new Date();
  const isTicketOwner =
    user?._id && (ticket.createdBy?._id === user._id || ticket.createdBy === user._id);

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            <h1 className="page-title">{ticket.ticketCode}</h1>
            <StatusBadge status={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {isOverdue && <span className="badge badge-danger">SLA Overdue</span>}
          </div>
          <p className="page-subtitle" style={{ fontSize: "var(--font-size-md)", fontWeight: 600 }}>
            {ticket.title}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/tickets" className="btn btn-secondary">
            Back to Queue
          </Link>
        </div>
      </div>

      {isClosed && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--color-text-subtle)", backgroundColor: "#f8fafc" }}>
          <div className="card-body" style={{ color: "var(--color-text-muted)" }}>
            <strong>Closed Ticket:</strong> This support ticket is closed and archived. No further status changes or comments may be added.
          </div>
        </div>
      )}

      {/* Employee Reopen Button */}
      {isResolved && isTicketOwner && !isStaff && (
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid var(--color-warning)" }}>
          <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Ticket Resolved:</strong> Has your problem been solved? If the issue persists, you may reopen this ticket.
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleReopenTicket}
              disabled={statusLoading}
            >
              {statusLoading ? "Reopening..." : "Reopen Ticket"}
            </button>
          </div>
        </div>
      )}

      <div className="details-grid">
        <div>
          {/* Issue Description */}
          <div className="detail-card">
            <h2 className="detail-card-title">Problem Description</h2>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-main)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {ticket.description}
            </div>
          </div>

          {/* Resolution Note if available */}
          {ticket.resolutionNote && (
            <div className="detail-card" style={{ borderLeft: "4px solid var(--color-success)" }}>
              <h2 className="detail-card-title">Resolution Notes</h2>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-main)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {ticket.resolutionNote}
              </p>
              {ticket.resolvedAt && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", marginTop: "0.5rem" }}>
                  Resolved on {new Date(ticket.resolvedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Comments Thread */}
          <div className="detail-card">
            <h2 className="detail-card-title">
              Conversation Thread ({ticket.comments?.length || 0})
            </h2>

            {/* Comments List */}
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="comments-thread">
                {ticket.comments.map((c, idx) => (
                  <div key={c._id || idx} className="comment-item">
                    <div className="comment-header">
                      <div className="comment-author">
                        <span>{c.author?.name || "Staff Member"}</span>
                        {c.author?.role && <StatusBadge status={c.author.role} />}
                      </div>
                      <div className="comment-date">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="comment-body">{c.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-subtle)", padding: "1rem 0" }}>
                No comments posted yet.
              </p>
            )}

            {/* Add Comment Box */}
            {!isClosed && (
              <form onSubmit={handleAddComment} style={{ marginTop: "1.5rem" }}>
                <FormField label="Add a Reply / Update" id="commentText" required>
                  <textarea
                    id="commentText"
                    className="form-control"
                    rows="3"
                    placeholder="Type an update, troubleshooting note, or response..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={commentSubmitting}
                    maxLength={1000}
                  />
                </FormField>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={commentSubmitting || !commentText.trim()}
                  >
                    {commentSubmitting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div>
          {/* Metadata Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Ticket Information</h2>
            <div className="key-value-list" style={{ gridTemplateColumns: "1fr" }}>
              <div className="key-value-item">
                <span className="key-value-label">Submitted By</span>
                <span className="key-value-val">
                  {ticket.createdBy?.name || "User"} ({ticket.createdBy?.email || ""})
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Category</span>
                <span className="key-value-val">
                  <span className="badge badge-neutral">{ticket.category}</span>
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Priority & SLA</span>
                <span className="key-value-val">
                  <StatusBadge status={ticket.priority} />
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">SLA Due Deadline</span>
                <span className="key-value-val" style={{ color: isOverdue ? "var(--color-danger)" : "inherit" }}>
                  {ticket.dueAt ? new Date(ticket.dueAt).toLocaleString() : "-"}
                </span>
              </div>
              <div className="key-value-item">
                <span className="key-value-label">Assigned Staff</span>
                <span className="key-value-val">
                  {ticket.assignedTo ? (
                    <strong>{ticket.assignedTo.name}</strong>
                  ) : (
                    <span style={{ color: "var(--color-text-subtle)", fontStyle: "italic" }}>Unassigned</span>
                  )}
                </span>
              </div>
              {ticket.relatedAsset && (
                <div className="key-value-item">
                  <span className="key-value-label">Related Asset</span>
                  <span className="key-value-val">
                    <Link to={`/assets/${ticket.relatedAsset._id}`} style={{ color: "var(--color-primary)" }}>
                      {ticket.relatedAsset.assetTag} - {ticket.relatedAsset.name}
                    </Link>
                  </span>
                </div>
              )}
              <div className="key-value-item">
                <span className="key-value-label">Created At</span>
                <span className="key-value-val">{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Staff Control Panel (ADMIN / IT_SUPPORT) */}
          {isStaff && !isClosed && (
            <div className="detail-card">
              <h2 className="detail-card-title">Staff Triage Actions</h2>

              {/* Assignment Form */}
              <form onSubmit={handleAssignSubmit} style={{ marginBottom: "1.25rem" }}>
                <FormField label="Assign Support Staff" id="assigneeSelect">
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      id="assigneeSelect"
                      className="form-control"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    >
                      <option value="">-- Select Staff --</option>
                      {staffUsers.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm"
                      disabled={assignLoading || !assigneeId || assigneeId === ticket.assignedTo?._id}
                    >
                      Assign
                    </button>
                  </div>
                </FormField>
              </form>

              {/* Status Transition Form */}
              <form onSubmit={handleStatusChangeSubmit}>
                <FormField label="Change Ticket Status" id="statusSelect">
                  <select
                    id="statusSelect"
                    className="form-control"
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS" disabled={!ticket.assignedTo && !assigneeId}>
                      IN_PROGRESS {!ticket.assignedTo ? "(Requires Assignee)" : ""}
                    </option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </FormField>

                {/* Resolution note required if moving to RESOLVED */}
                {statusVal === "RESOLVED" && (
                  <FormField
                    label="Resolution Note"
                    id="resNote"
                    required
                    hint="Document how this issue was resolved (min 5 characters)"
                  >
                    <textarea
                      id="resNote"
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Replaced damaged HDMI cable and verified dual display working."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      required
                    />
                  </FormField>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ width: "100%", marginTop: "0.75rem" }}
                  disabled={statusLoading || statusVal === ticket.status}
                >
                  {statusLoading ? "Updating..." : "Update Status"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
