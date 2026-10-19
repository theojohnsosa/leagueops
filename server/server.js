import dns from "node:dns";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";

import { startArchiveExpirationJob } from "./jobs/archiveExpiration.job.js";

import registrationRoutes from "./routes/registrations.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import announcementRoutes from "./routes/announcements.routes.js";
import authRoutes from "./routes/auth.routes.js";
import approvalRoutes from "./routes/approvals.routes.js";
import eventRoutes from "./routes/events.routes.js";
import userRoutes from "./routes/users.routes.js";
import eventLogsRoutes from "./routes/eventLogs.routes.js";
import auditLogsRoutes from "./routes/auditLogs.routes.js";

import { notFound, errorHandler } from "./middleware/errorHandler.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.join(currentDirectory, ".env"),
});

const app = express();

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "LeagueOps API",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Register API routes.
app.use("/api", registrationRoutes);
app.use("/api", matchRoutes);
app.use("/api", archiveRoutes);
app.use("/api", eventRoutes);
app.use("/api", eventLogsRoutes);
app.use("/api", auditLogsRoutes);
app.use("/api", announcementRoutes);
app.use("/api", authRoutes);
app.use("/api", approvalRoutes);
app.use("/api", userRoutes);

// Error handlers must come after all API routes.
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not configured.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas connected");

    // Run archive expiration once at startup and then every minute.
    startArchiveExpirationJob();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
