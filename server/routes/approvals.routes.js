import { Router } from "express";
import {
  getApprovalRequests,
  reviewEventApproval,
} from "../controllers/approvals.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Only admins can view and review approval requests.
router.get(
  "/approvals",
  requireAuth,
  requireRole("admin"),
  getApprovalRequests,
);

router.patch(
  "/approvals/:id/review",
  requireAuth,
  requireRole("admin"),
  reviewEventApproval,
);

export default router;
