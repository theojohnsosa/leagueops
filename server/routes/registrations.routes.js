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

const staffRoles = ["admin", "head", "committee"];

// Create a registration.
router.post("/events/:eventId/registrations", requireAuth, createRegistration);

// List registrations for a specific event (staff only).
router.get(
  "/events/:eventId/registrations",
  requireAuth,
  requireRole(...staffRoles),
  getRegistrationsByEvent,
);

// List all registrations (staff only).
router.get(
  "/registrations",
  requireAuth,
  requireRole(...staffRoles),
  listRegistrations,
);

// Keep "mine" before "/:id".
router.get("/registrations/mine", requireAuth, getMyRegistrations);

// Get a specific registration.
router.get("/registrations/:id", requireAuth, getRegistrationById);

// Update registration status (staff only).
router.patch(
  "/registrations/:id/status",
  requireAuth,
  requireRole(...staffRoles),
  updateRegistrationStatus,
);

// Cancel a registration.
router.patch("/registrations/:id/cancel", requireAuth, cancelRegistration);

export default router;
