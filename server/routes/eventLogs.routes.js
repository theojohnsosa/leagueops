
import { Router } from "express";
import { getEventLogs } from "../controllers/eventLogs.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
  "/event-logs",
  requireAuth,
  requireRole("admin", "head"),
  getEventLogs,
);

export default router;
