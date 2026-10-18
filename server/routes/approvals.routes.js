import { Router } from "express";
import {
  getApprovalRequests,
  reviewEventApproval,
  reviewUserDeactivation,
} from "../controllers/approvals.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

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

router.patch(
  "/approvals/:id/user-deactivation-review",
  requireAuth,
  requireRole("admin"),
  reviewUserDeactivation,
);

export default router;
