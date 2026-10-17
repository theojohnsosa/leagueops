
import { Router } from "express";
import {
  archiveEvent,
  getArchivedEvents,
  restoreEvent,
} from "../controllers/archive.controller.js";

const router = Router();

router.get("/archive/events", getArchivedEvents);
router.patch("/events/:id/archive", archiveEvent);
router.patch("/events/:id/restore", restoreEvent);

export default router;
