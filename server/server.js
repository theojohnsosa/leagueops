import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";

import registrationRoutes from "./routes/registrations.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import announcementRoutes from "./routes/announcements.routes.js";
import authRoutes from "./routes/auth.routes.js";
import eventRoutes from "./routes/events.routes.js";
import approvalRoutes from "./routes/approvals.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.join(currentDirectory, ".env"),
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Health check.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "LeagueOps API",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// API routes.
app.use("/api", registrationRoutes);
app.use("/api", matchRoutes);
app.use("/api", announcementRoutes);
app.use("/api", authRoutes);
app.use("/api", eventRoutes);
app.use("/api", archiveRoutes);
app.use("/api", approvalRoutes);

// Error handlers must come after all API routes.
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB before starting the server.
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
