// Purpose: Empty state display component for empty lists and search results

export default function EmptyState({
  title = "No records found",
  description = "There are no items to display at this time.",
  action = null
}) {
  return (
    <div className="empty-state">
      <svg
        className="empty-state-icon"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-text">{description}</div>
      {action && <div style={{ marginTop: "1rem" }}>{action}</div>}
    </div>
  );
}
