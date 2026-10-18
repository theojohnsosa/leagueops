import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Schedule from "./pages/admin/schedule.jsx";
import EventSchedule from "./pages/admin/eventSchedule.jsx";
import EventLogs from "./pages/admin/EventLogs.jsx";
import AuditLogs from "./pages/admin/AuditLogs.jsx";
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

      {/* Admin dashboard and management pages */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/dashboard" element={<ArchiveDashboard />} />
        <Route path="/archive" element={<ArchiveDashboard />} />
        <Route path="/event-logs" element={<ArchiveDashboard />} />
        <Route path="/audit-logs" element={<ArchiveDashboard />} />
        <Route path="/manage-events" element={<ArchiveDashboard />} />
        <Route path="/registrations" element={<ArchiveDashboard />} />
        <Route path="/schedule-manager" element={<ArchiveDashboard />} />
        <Route path="/users" element={<ArchiveDashboard />} />
        <Route path="/announcements" element={<ArchiveDashboard />} />

        <Route path="/admin/schedule" element={<Schedule />} />
        <Route path="/admin/schedule/:eventId" element={<EventSchedule />} />
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
