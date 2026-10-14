// Purpose: Reusable pagination controls with page calculation and accessibility

export default function Pagination({
  page = 1,
  limit = 10,
  total = 0,
  onPageChange
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1 && total === 0) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate window of page numbers
  const pages = [];
  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    pages.push(p);
  }

  return (
    <nav className="pagination" aria-label="Pagination Navigation">
      <div className="pagination-info">
        Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{total}</strong> records
      </div>
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous Page"
        >
          Previous
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination-btn ${p === page ? "active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next Page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
