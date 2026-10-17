import { Router } from "express";
import {
  archiveEvent,
  getArchivedEvents,
  restoreEvent,
} from "../controllers/archive.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Admin, head, and committee can view archived events.
router.get(
  "/archive/events",
  requireAuth,
  requireRole("admin", "head", "committee"),
  getArchivedEvents,
);

// Only admin and head can archive events.
router.patch(
  "/events/:id/archive",
  requireAuth,
  requireRole("admin", "head"),
  archiveEvent,
);

// Only admin can restore archived events.
router.patch(
  "/events/:id/restore",
  requireAuth,
  requireRole("admin"),
  restoreEvent,
);

export default router;
