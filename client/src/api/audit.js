// Purpose: Audit logs API service functions (stubs for Part 8)
import http from "./http";

export async function getAuditLogs(params = {}) {
  const res = await http.get("/audit-logs", { params });
  return res.data;
}
