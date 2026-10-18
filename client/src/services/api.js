import axios from "axios";

export const USE_MOCK = false;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  withCredentials: true,
});

export default api;

export function errorMessage(err) {
  if (!err.response) {
    return "Cannot reach the server. Is it running?";
  }

  const data = err.response.data;
  const detail = data?.errors?.map((e) => e.message).join(" ");

  return [data?.message ?? err.message, detail].filter(Boolean).join(" ");
}
