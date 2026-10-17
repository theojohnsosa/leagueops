import { Router } from "express";
import * as C from "../controllers/events.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public event endpoints.
router.get("/events", C.getEvents);
router.get("/events/:id", C.getEventById);

// Administrative dashboard.
router.get(
  "/dashboard/stats",
  requireAuth,
  requireRole("admin", "head"),
  C.getDashboardStats,
);

// Event management.
router.post(
  "/events",
  requireAuth,
  requireRole("admin", "head"),
  C.createEvent,
);

router.patch(
  "/events/:id",
  requireAuth,
  requireRole("admin", "head"),
  C.updateEvent,
);

router.patch(
  "/events/:id/complete",
  requireAuth,
  requireRole("admin", "head"),
  C.completeEvent,
);

export default router;
