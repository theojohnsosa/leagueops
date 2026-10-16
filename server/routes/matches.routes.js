import { Router } from "express";
import {
  createMatch,
  getMatchesByEvent,
  getMatchById,
  updateMatch,
  recordResult,
  cancelMatch,
  getStandings,
} from "../controllers/matches.controller.js";
// import { requireAuth } from "../middleware/auth.js"; // your auth, when it exists

const router = Router();

router.post("/events/:eventId/matches", /* requireAuth, */ createMatch);
router.get("/events/:eventId/matches", getMatchesByEvent);
router.get("/events/:eventId/standings", getStandings);

router.get("/matches/:id", getMatchById);
router.patch("/matches/:id", /* requireAuth, */ updateMatch);
router.patch("/matches/:id/result", /* requireAuth, */ recordResult);
router.patch("/matches/:id/cancel", /* requireAuth, */ cancelMatch);

export default router;
