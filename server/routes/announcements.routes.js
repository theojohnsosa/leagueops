import { Router } from "express";
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  setStatus,
  deleteAnnouncement,
} from "../controllers/announcements.controller.js";
// import { requireAuth } from "../middleware/auth.js"; // your auth, when it exists

const router = Router();

router.post("/announcements", /* requireAuth, */ createAnnouncement);
router.get("/announcements", getAnnouncements);
router.get("/announcements/:id", getAnnouncementById);
router.patch("/announcements/:id", /* requireAuth, */ updateAnnouncement);
router.patch("/announcements/:id/status", /* requireAuth, */ setStatus);
router.delete("/announcements/:id", /* requireAuth, */ deleteAnnouncement);

export default router;
