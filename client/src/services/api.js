import axios from "axios";

// true when client/.env has VITE_USE_MOCK=true
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // sends the leagueops_token cookie with every request
});

export default api;
