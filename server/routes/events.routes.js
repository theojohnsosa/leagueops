import { Router } from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  completeEvent,
  getDashboardStats,
} from "../controllers/events.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public event endpoints.
router.get("/events", getEvents);
router.get("/events/:id", getEventById);

// Administrative dashboard.
router.get(
  "/dashboard/stats",
  requireAuth,
  requireRole("admin", "head"),
  getDashboardStats,
);

// Create and update events.
router.post("/events", requireAuth, requireRole("admin", "head"), createEvent);

router.patch(
  "/events/:id",
  requireAuth,
  requireRole("admin", "head"),
  updateEvent,
);

// Complete approved events.
router.patch(
  "/events/:id/complete",
  requireAuth,
  requireRole("admin", "head"),
  completeEvent,
);

export default router;
