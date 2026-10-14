// Purpose: Hardware assets API service functions (stubs for Part 8)
import http from "./http";

export async function getAssets(params = {}) {
  const res = await http.get("/assets", { params });
  return res.data;
}

export async function getMyAssets() {
  const res = await http.get("/assets/mine");
  return res.data.data;
}

export async function getAssetById(id) {
  const res = await http.get(`/assets/${id}`);
  return res.data.data;
}

export async function createAsset(data) {
  const res = await http.post("/assets", data);
  return res.data.data;
}

export async function updateAsset(id, data) {
  const res = await http.put(`/assets/${id}`, data);
  return res.data.data;
}

export async function assignAsset(id, userId) {
  const res = await http.patch(`/assets/${id}/assign`, { userId });
  return res.data.data;
}

export async function unassignAsset(id) {
  const res = await http.patch(`/assets/${id}/unassign`);
  return res.data.data;
}

export async function updateAssetStatus(id, status) {
  const res = await http.patch(`/assets/${id}/status`, { status });
  return res.data.data;
}
