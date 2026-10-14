// Purpose: User management API service functions
import http from "./http";

export async function getUsers(params = {}) {
  const res = await http.get("/users", { params });
  return res.data;
}

export async function getUserById(id) {
  const res = await http.get(`/users/${id}`);
  return res.data.data;
}

export async function createUser(data) {
  const res = await http.post("/users", data);
  return res.data.data;
}

export async function updateUser(id, data) {
  const res = await http.put(`/users/${id}`, data);
  return res.data.data;
}

export async function updateUserStatus(id, isActive) {
  const res = await http.patch(`/users/${id}/status`, { isActive });
  return res.data.data;
}

export async function lookupUsers() {
  const res = await http.get("/users/lookup");
  return res.data.data;
}
