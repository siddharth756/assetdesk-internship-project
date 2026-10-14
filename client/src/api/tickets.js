// Purpose: Support tickets API service functions (stubs for Part 8)
import http from "./http";

export async function getTickets(params = {}) {
  const res = await http.get("/tickets", { params });
  return res.data;
}

export async function getTicketById(id) {
  const res = await http.get(`/tickets/${id}`);
  return res.data.data;
}

export async function createTicket(data) {
  const res = await http.post("/tickets", data);
  return res.data.data;
}

export async function assignTicket(id, assignedTo) {
  const res = await http.patch(`/tickets/${id}/assign`, { assignedTo });
  return res.data.data;
}

export async function updateTicketStatus(id, status, resolutionNote = "") {
  const res = await http.patch(`/tickets/${id}/status`, {
    status,
    resolutionNote
  });
  return res.data.data;
}

export async function addTicketComment(id, message) {
  const res = await http.post(`/tickets/${id}/comments`, { message });
  return res.data.data;
}
