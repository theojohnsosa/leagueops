import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/health`)
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="rounded-xl border-t-8 border-[#0038a8] shadow-lg p-8 w-96">
        <h1 className="text-2xl font-bold text-[#0038a8]">LeagueOps</h1>
        <p className="text-sm text-gray-600 mb-4">
          Event Registration and Management System
        </p>
        {error && <p className="text-[#ce1126]">API error: {error}</p>}
        {health && (
          <p className="text-green-700">
            API: {health.status} | Database: {health.database}
          </p>
        )}
        {!health && !error && <p className="text-gray-500">Checking API...</p>}
      </div>
    </div>
  );
}