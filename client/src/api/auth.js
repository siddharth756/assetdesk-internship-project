// Purpose: Authentication API service functions
import http from "./http";

/**
 * Log in user with credentials
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} { user, token }
 */
export async function login(email, password) {
  const res = await http.post("/auth/login", { email, password });
  return res.data.data;
}

/**
 * Fetch current authenticated user profile
 * @returns {Promise<Object>} user
 */
export async function getMe() {
  const res = await http.get("/auth/me");
  return res.data.data;
}

/**
 * Change current user password
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<Object>}
 */
export async function changePassword(currentPassword, newPassword) {
  const res = await http.post("/auth/change-password", {
    currentPassword,
    newPassword
  });
  return res.data.data;
}
