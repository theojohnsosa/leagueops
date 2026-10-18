import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  requestUserDeactivation,
} from "../controllers/users.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All user-management endpoints are restricted to administrators.
router.use(requireAuth, requireRole("admin"));

router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/status", updateUserStatus);

router.post("/users/:id/deactivation-request", requestUserDeactivation);

export default router;
