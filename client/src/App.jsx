import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Schedule from "./pages/admin/schedule.jsx";
import EventSchedule from "./pages/admin/eventSchedule.jsx";
import Bracket from "./pages/bracket.jsx";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Landing from "./pages/public/Landing.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public: anyone can open these */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      {/* Public: anyone can open these */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/bracket" element={<Bracket />} />
      </Route>

      {/* Role-restricted. Confirm the exact roles with Theo and CONTRIBUTING.md */}
      <Route element={<ProtectedRoute roles={["admin"]} />}></Route>
      <Route element={<ProtectedRoute roles={["admin", "head"]} />}></Route>

      {/* Role-restricted. Confirm the exact roles with Theo and CONTRIBUTING.md */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin/schedule" element={<Schedule />} />
        <Route path="/admin/schedule/:eventId" element={<EventSchedule />} />
      </Route>
      <Route element={<ProtectedRoute roles={["admin", "head"]} />}></Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
