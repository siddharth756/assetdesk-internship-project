// Purpose: Reusable table component with loading state, empty state, and column configurations
import Loader from "./Loader";
import EmptyState from "./EmptyState";

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no records matching your current filter criteria.",
  keyField = "_id"
}) {
  if (loading) {
    return (
      <div className="table-container">
        <Loader text="Loading records..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} scope="col" className={col.headerClassName || ""}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const rowKey = row[keyField] || row.id || rowIdx;
            return (
              <tr key={rowKey}>
                {columns.map((col, colIdx) => {
                  const val = col.key ? row[col.key] : null;
                  const content = col.render ? col.render(val, row) : val !== null && val !== undefined ? String(val) : "-";
                  return (
                    <td key={col.key || colIdx} className={col.className || ""}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
