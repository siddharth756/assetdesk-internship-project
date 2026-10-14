// Purpose: StatusBadge mapping contract enumerations to semantic badge colors

const BADGE_MAP = {
  // Roles
  ADMIN: "badge-primary",
  IT_SUPPORT: "badge-info",
  EMPLOYEE: "badge-neutral",

  // Asset Status
  AVAILABLE: "badge-success",
  ASSIGNED: "badge-info",
  MAINTENANCE: "badge-warning",
  RETIRED: "badge-neutral",

  // Ticket Priority
  CRITICAL: "badge-danger",
  HIGH: "badge-warning",
  MEDIUM: "badge-info",
  LOW: "badge-neutral",

  // Ticket Status
  OPEN: "badge-warning",
  IN_PROGRESS: "badge-info",
  RESOLVED: "badge-success",
  CLOSED: "badge-neutral",

  // License Status
  ACTIVE: "badge-success",
  EXPIRING: "badge-warning",
  EXPIRED: "badge-danger",

  // User Status
  ACTIVE_USER: "badge-success",
  INACTIVE_USER: "badge-danger"
};

export default function StatusBadge({ status, label }) {
  if (status === null || status === undefined) return null;

  const key = String(status).toUpperCase();
  const badgeClass = BADGE_MAP[key] || "badge-neutral";
  const displayLabel = label || status;

  return <span className={`badge ${badgeClass}`}>{displayLabel}</span>;
}
