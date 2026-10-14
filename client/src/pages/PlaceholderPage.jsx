// Purpose: Placeholder component for routes to be implemented in Part 8

export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Module section under active development</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <span className="placeholder-badge">Coming in Part 8</span>
          <h2>{title} Page</h2>
          <p className="form-hint" style={{ maxWidth: "480px", margin: "0.5rem auto" }}>
            {description || "This module page will be fully implemented with data tables, search, filters, and forms in Part 8 (Frontend Module Pages)."}
          </p>
        </div>
      </div>
    </div>
  );
}
