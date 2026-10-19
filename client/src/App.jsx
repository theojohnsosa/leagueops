import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Bracket from "./pages/bracket.jsx";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Landing from "./pages/public/Landing.jsx";
import ArchiveDashboard from "./ArchiveDashboard.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/bracket" element={<Bracket />} />
      </Route>

      {/* Admin pages: ArchiveDashboard draws the header and picks the page */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/dashboard" element={<ArchiveDashboard />} />
        <Route path="/archive" element={<ArchiveDashboard />} />
        <Route path="/event-logs" element={<ArchiveDashboard />} />
        <Route path="/audit-logs" element={<ArchiveDashboard />} />
        <Route path="/manage-events" element={<ArchiveDashboard />} />
        <Route path="/registrations" element={<ArchiveDashboard />} />
        <Route path="/schedule-manager" element={<ArchiveDashboard />} />
        <Route path="/schedule-manager/:eventId" element={<ArchiveDashboard />} />
        <Route path="/users" element={<ArchiveDashboard />} />
        <Route path="/announcements" element={<ArchiveDashboard />} />
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}