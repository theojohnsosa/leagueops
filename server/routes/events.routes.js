
import { Router } from "express";
import { getDashboardStats } from "../controllers/events.controller.js";

const router = Router();

router.get("/dashboard/stats", getDashboardStats);

export default router;
