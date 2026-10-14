// Purpose: Software licenses API service functions (stubs for Part 8)
import http from "./http";

export async function getLicenses(params = {}) {
  const res = await http.get("/licenses", { params });
  return res.data;
}

export async function getLicenseById(id) {
  const res = await http.get(`/licenses/${id}`);
  return res.data.data;
}

export async function createLicense(data) {
  const res = await http.post("/licenses", data);
  return res.data.data;
}

export async function updateLicense(id, data) {
  const res = await http.put(`/licenses/${id}`, data);
  return res.data.data;
}

export async function allocateSeat(id, userId) {
  const res = await http.post(`/licenses/${id}/allocate`, { userId });
  return res.data.data;
}

export async function releaseSeat(id, userId) {
  const res = await http.delete(`/licenses/${id}/allocate/${userId}`);
  return res.data.data;
}

export async function getExpiringLicenses(days = 30) {
  const res = await http.get(`/licenses/expiring?days=${days}`);
  return res.data.data;
}
