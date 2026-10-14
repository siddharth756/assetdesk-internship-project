// Purpose: Reports export API service functions (stubs for Part 8)
import http from "./http";

export async function downloadReport(type, params = {}) {
  const res = await http.get(`/reports/${type}`, {
    params,
    responseType: "blob"
  });
  return res.data;
}
