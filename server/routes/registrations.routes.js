import { Router } from "express";
import {
  createRegistration,
  getRegistrationsByEvent,
  listRegistrations,
  getMyRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  cancelRegistration,
} from "../controllers/registrations.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const registrationStaff = ["admin", "head", "committee"];

// Students and authenticated users can register for events.
router.post("/events/:eventId/registrations", requireAuth, createRegistration);

// Staff can view registrations for a specific event.
router.get(
  "/events/:eventId/registrations",
  requireAuth,
  requireRole(...registrationStaff),
  getRegistrationsByEvent,
);

// Staff can view all registrations.
router.get(
  "/registrations",
  requireAuth,
  requireRole(...registrationStaff),
  listRegistrations,
);

// Keep "mine" before "/:id".
router.get("/registrations/mine", requireAuth, getMyRegistrations);

router.get("/registrations/:id", requireAuth, getRegistrationById);

// Only staff can change a registration's status.
router.patch(
  "/registrations/:id/status",
  requireAuth,
  requireRole(...registrationStaff),
  updateRegistrationStatus,
);

// Authenticated users can request cancellation.
// The controller must verify ownership or staff authorization.
router.patch("/registrations/:id/cancel", requireAuth, cancelRegistration);

export default router;
