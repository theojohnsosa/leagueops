import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Schedule from "./pages/admin/schedule.jsx";
import EventSchedule from "./pages/admin/eventSchedule.jsx";
import Bracket from "./pages/bracket.jsx";

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
import Landing from "./pages/public/Landing.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/registrations" element={<Registrations />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/bracket" element={<Bracket />} />
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/users" element={<Users />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/admin/schedule" element={<Schedule />} />
        <Route path="/admin/schedule/:eventId" element={<EventSchedule />} />
      </Route>

      {/* Admin and head */}
      <Route element={<ProtectedRoute roles={["admin", "head"]} />}>
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/archive" element={<Archive />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
