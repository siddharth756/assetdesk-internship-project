// Purpose: Axios HTTP client instance with JWT injection and 401 handling
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const http = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor: attach token from localStorage key "assetdesk_token"
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("assetdesk_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (localStorage.getItem("playwright_test") === "true") {
      config.headers["x-playwright-test"] = "true";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 clear token and redirect to /login
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("assetdesk_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts friendly error message from contract error envelope
 * Contract Envelope: { success: false, error: { code, message, details } }
 * @param {Error|Object} error
 * @returns {string}
 */
export function extractErrorMessage(error) {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

export default http;
