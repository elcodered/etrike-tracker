import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json" },
});
export const get = async (path, params) =>
  (await api.get(`/api/${path}`, { params })).data;
export const post = async (path, data = {}) =>
  (await api.post(`/api/${path}`, data)).data;
export const put = async (path, data) =>
  (await api.put(`/api/${path}`, data)).data;
export const remove = async (path) => api.delete(`/api/${path}`);
export const errorText = (error) =>
  Object.values(error?.response?.data?.errors || {})
    .flat()
    .join(" ") ||
  error?.response?.data?.message ||
  "Unable to connect. Please try again.";
