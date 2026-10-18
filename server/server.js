import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";
import dns from "node:dns";

import registrationRoutes from "./routes/registrations.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import announcementRoutes from "./routes/announcements.routes.js";
import authRoutes from "./routes/auth.routes.js";
import approvalRoutes from "./routes/approvals.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import eventRoutes from "./routes/events.routes.js";
import userRoutes from "./routes/users.routes.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.join(currentDirectory, ".env"),
});

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
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

// Register each API route once.
app.use("/api", registrationRoutes);
app.use("/api", matchRoutes);
app.use("/api", archiveRoutes);
app.use("/api", eventRoutes);
app.use("/api", announcementRoutes);
app.use("/api", authRoutes);
app.use("/api", approvalRoutes);
app.use("/api", userRoutes);

// Error handlers must come after all API routes.
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
