// Purpose: Dashboard API service functions
import http from "./http";

export async function getDashboardSummary() {
  const res = await http.get("/dashboard/summary");
  return res.data.data;
}
