import { Router } from "express";
import {
  getEvents,
  getArchivedEvents,
  getEventById,
  createEvent,
  updateEvent,
  archiveEvent,
  restoreEvent,
  completeEvent,
} from "../controllers/events.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Anyone can view events.
router.get("/events", getEvents);

router.get(
  "/events/archive",
  requireAuth,
  requireRole("admin", "head"),
  getArchivedEvents,
);

router.get("/events/:id", getEventById);

// Admins and heads can create and manage events.
router.post("/events", requireAuth, requireRole("admin", "head"), createEvent);

router.patch(
  "/events/:id/complete",
  requireAuth,
  requireRole("admin", "head"),
  completeEvent,
);

// Only admins can restore archived events.
router.patch(
  "/events/:id/restore",
  requireAuth,
  requireRole("admin"),
  restoreEvent,
);

// Only events pending approval can be archived.
router.patch(
  "/events/:id/archive",
  requireAuth,
  requireRole("admin", "head"),
  archiveEvent,
);

export default router;
