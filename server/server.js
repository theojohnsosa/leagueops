import dns from "node:dns";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import registrationRoutes from "./routes/registrations.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import eventRoutes from "./routes/events.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
// Node's own DNS lookup is being refused on this network, so use public DNS.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const app = express();

// ---------- Middleware (always BEFORE routes) ----------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ---------- Routes ----------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "LeagueOps API",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api", registrationRoutes);
app.use("/api", matchRoutes);
app.use("/api", eventRoutes);
app.use("/api", archiveRoutes);
// ---------- Start ----------
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
