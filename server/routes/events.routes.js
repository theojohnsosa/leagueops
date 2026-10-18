import { Router } from "express";
import {
  getDashboardStats,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  completeEvent,
} from "../controllers/events.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Dashboard statistics.
router.get(
  "/dashboard/stats",
  requireAuth,
  requireRole("admin", "head"),
  getDashboardStats,
);

// Public event viewing.
router.get("/events", getEvents);
router.get("/events/:id", getEventById);

// Event management.
router.post("/events", requireAuth, requireRole("admin", "head"), createEvent);

router.patch(
  "/events/:id",
  requireAuth,
  requireRole("admin", "head"),
  updateEvent,
);

router.patch(
  "/events/:id/complete",
  requireAuth,
  requireRole("admin", "head"),
  completeEvent,
);

export default router;
