import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import axios from "axios";
import Header from "./components/Header.jsx";
import Registrations from "./pages/admin/registrations.jsx";
import Schedule from "./pages/admin/schedule.jsx";
import EventSchedule from "./pages/admin/eventSchedule.jsx";
import Bracket from "./pages/bracket.jsx";

function Home() {
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

// Shown for header links whose pages are not built yet.
function NotBuilt() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl p-10 text-center text-gray-500">
        This page has not been built yet.
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/registrations" element={<Registrations />} />
      <Route path="/admin/schedule" element={<Schedule />} />
      <Route path="/bracket" element={<Bracket />} />
      <Route path="*" element={<NotBuilt />} />
      <Route path="/admin/schedule/:eventId" element={<EventSchedule />} />
    </Routes>
  );
}
