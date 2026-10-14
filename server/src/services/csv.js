// Purpose: CSV generation service with RFC-4180 escaping and spreadsheet formula injection mitigation
const INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Sanitizes and escapes an individual cell value for CSV output:
 * 1. Mitigates CSV/formula injection by prefixing cells starting with =, +, -, @, \t, or \r with a single quote (')
 * 2. Wraps cells containing double quotes, commas, or newlines in double quotes and doubles internal double quotes
 * @param {*} value - Raw value
 * @returns {string} Sanitized CSV cell string
 */
function sanitizeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let str;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // Formula injection mitigation (prefix leading dangerous characters with single quote)
  if (str.length > 0 && INJECTION_PREFIXES.includes(str[0])) {
    str = `'${str}`;
  }

  // RFC-4180 escaping: wrap in quotes if it contains quotes, commas, or newlines
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts column definitions and row objects into a standard CSV string
 * @param {Array<Object|string>} columns - Column definitions [{ key: "field", header: "Label" }] or array of keys
 * @param {Array<Object>} rows - Array of row data objects
 * @returns {string} Formatted CSV text
 */
function toCsv(columns = [], rows = []) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return "";
  }

  // Normalize column definitions
  const normalizedCols = columns.map((col) => {
    if (typeof col === "string") {
      return { key: col, header: col };
    }
    return {
      key: col.key || "",
      header: col.header || col.label || col.key || ""
    };
  });

  // Header row
  const headerLine = normalizedCols.map((c) => sanitizeCell(c.header)).join(",");

  if (!Array.isArray(rows) || rows.length === 0) {
    return `${headerLine}\r\n`;
  }

  // Data rows
  const dataLines = rows.map((row) => {
    return normalizedCols
      .map((col) => {
        const val = row && typeof row === "object" ? row[col.key] : "";
        return sanitizeCell(val);
      })
      .join(",");
  });

  return `${headerLine}\r\n${dataLines.join("\r\n")}\r\n`;
}

module.exports = {
  sanitizeCell,
  toCsv
};
