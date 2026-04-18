import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export const streamUrl = (trackId, which) => {
  const token = localStorage.getItem("auth_token");
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API}/tracks/${trackId}/stream/${which}${qs}`;
};

export const downloadUrl = (trackId, format) => {
  const token = localStorage.getItem("auth_token");
  const params = new URLSearchParams({ format });
  if (token) params.set("token", token);
  return `${API}/tracks/${trackId}/download?${params.toString()}`;
};
