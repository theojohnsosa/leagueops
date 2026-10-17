import { Router } from "express";
import {
  createRegistration,
  getRegistrationsByEvent,
  listRegistrations, // NEW
  getMyRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  cancelRegistration,
} from "../controllers/registrations.controller.js";
// import { requireAuth, requireAdmin } from "../middleware/auth.js"; // your auth

const router = Router();

router.post(
  "/events/:eventId/registrations",
  /* requireAuth, */ createRegistration,
);
router.get(
  "/events/:eventId/registrations",
  /* requireAuth, requireAdmin, */ getRegistrationsByEvent,
);

// NEW: admin list of all registrations (used by the admin Registrations page)
router.get("/registrations", /* requireAuth, requireAdmin, */ listRegistrations);

// "mine" must come BEFORE "/:id", or Express treats "mine" as an ID
router.get("/registrations/mine", /* requireAuth, */ getMyRegistrations);
router.get("/registrations/:id", /* requireAuth, */ getRegistrationById);

router.patch(
  "/registrations/:id/status",
  /* requireAuth, requireAdmin, */ updateRegistrationStatus,
);
router.patch(
  "/registrations/:id/cancel",
  /* requireAuth, */ cancelRegistration,
);

export default router;