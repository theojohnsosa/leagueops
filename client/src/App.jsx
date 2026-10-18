<<<<<<< HEAD
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Events from "./pages/Events.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Registrations from "./pages/Registrations.jsx";
import Matches from "./pages/Matches.jsx";
import Announcements from "./pages/Announcements.jsx";
import Users from "./pages/Users.jsx";
import Approvals from "./pages/Approvals.jsx";
import Archive from "./pages/Archive.jsx";
import Logs from "./pages/Logs.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
=======
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import axios from "axios";
import Header from "./components/Header.jsx";
import Registrations from "./pages/admin/registrations.jsx";

function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/health`)
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.message));
  }, []);

>>>>>>> 7fb1d199014735d26c181fe8a3e0ac5181f6b0ee
  return (
    <Routes>
      {/* Public: anyone can open these */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/registrations" element={<Registrations />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/announcements" element={<Announcements />} />
      </Route>

      {/* Role-restricted. Confirm the exact roles with Theo and CONTRIBUTING.md */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/users" element={<Users />} />
        <Route path="/logs" element={<Logs />} />
      </Route>
      <Route element={<ProtectedRoute roles={["admin", "head"]} />}>
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/archive" element={<Archive />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
<<<<<<< HEAD
=======

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
      <Route path="*" element={<NotBuilt />} />
    </Routes>
  );
}
>>>>>>> 7fb1d199014735d26c181fe8a3e0ac5181f6b0ee
