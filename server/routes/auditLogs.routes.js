
import { Router } from "express";
import { getAuditLogs } from "../controllers/auditLogs.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
  "/audit-logs",
  requireAuth,
  requireRole("admin"),
  getAuditLogs,
);

export default router;

