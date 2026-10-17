import dotenv from "dotenv";
import dns from "node:dns";
import express from "express";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";

import registrationRoutes from "./routes/registrations.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import announcementRoutes from "./routes/announcements.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.join(currentDirectory, ".env"),
});

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

if (process.env.DEV_FAKE_ADMIN === "true") {
  app.use((req, res, next) => {
    req.user = { _id: "64b000000000000000000001", role: "admin" };
    next();
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "LeagueOps API",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Authentication and API routes must come before the 404 handler.
app.use("/api", registrationRoutes);
app.use("/api", matchRoutes);
app.use("/api", authRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

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
