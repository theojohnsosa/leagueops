import axios from "axios";

// Should end with /api, for example http://localhost:5000/api
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  withCredentials: true,
});

// Turns an axios error into one readable sentence (includes rule errors).
export function errorMessage(err) {
  if (!err.response) return "Cannot reach the server. Is it running?";
  const data = err.response.data;
  const detail = data?.errors?.map((e) => e.message).join(" ");
  return [data?.message ?? err.message, detail].filter(Boolean).join(" ");
}

export default api;