import { Router } from "express";
import {
  signup,
  verifyEmail,
  resendVerification,
  login,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public routes
router.post("/auth/signup", signup);
router.post("/auth/verify-email", verifyEmail);
router.post("/auth/resend-verification", resendVerification);
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);

// Authenticated routes
router.post("/auth/logout", requireAuth, logout);
router.get("/auth/me", requireAuth, getMe);
router.patch("/auth/me", requireAuth, updateMe);

export default router;
