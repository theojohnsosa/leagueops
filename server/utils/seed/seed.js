import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import User from "../../models/Users.js";
import Event from "../../models/Events.js";
import Registration from "../../models/Registrations.js";
import Match from "../../models/Matches.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const requiredEnv = ["MONGO_URI", "SEED_ADMIN_PASSWORD"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Seeding is disabled in production.");
}

async function upsertUser(data) {
  return User.findOneAndUpdate(
    { studentEmail: data.studentEmail.toLowerCase() },
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
}

async function upsertEvent(data) {
  return Event.findOneAndUpdate(
    { title: data.title, season: data.season },
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
}

async function upsertRegistration(data) {
  return Registration.findOneAndUpdate(
    { eventId: data.eventId, teamName: data.teamName },
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
}

async function upsertMatch(data) {
  return Match.findOneAndUpdate(
    { eventId: data.eventId, matchNumber: data.matchNumber },
    { $set: data },
    { upsert: true, new: true, runValidators: true },
  );
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);

  const admin = await upsertUser({
    studentId: process.env.SEED_ADMIN_STUDENT_ID || "SEED-ADMIN-001",
    firstName: "LeagueOps",
    lastName: "Administrator",
    studentEmail:
      process.env.SEED_ADMIN_EMAIL || "leagueops.admin@students.nu-moa.edu.ph",
    department: "Information Technology",
    inGameName: "LeagueOpsAdmin",
    passwordHash,
    role: "admin",
    isActive: true,
    isEmailVerified: true,
  });

  const playerData = [
    {
      studentId: "SEED-PLAYER-001",
      firstName: "Alex",
      lastName: "Reyes",
      studentEmail: "alex.reyes@students.nu-moa.edu.ph",
      department: "Information Technology",
      inGameName: "AlexR",
      role: "player",
      isActive: true,
      isEmailVerified: true,
    },
    {
      studentId: "SEED-PLAYER-002",
      firstName: "Jamie",
      lastName: "Santos",
      studentEmail: "jamie.santos@students.nu-moa.edu.ph",
      department: "Information Technology",
      inGameName: "JamieS",
      role: "player",
      isActive: true,
      isEmailVerified: true,
    },
    {
      studentId: "SEED-PLAYER-003",
      firstName: "Morgan",
      lastName: "Cruz",
      studentEmail: "morgan.cruz@students.nu-moa.edu.ph",
      department: "Information Technology",
      inGameName: "MorganC",
      role: "player",
      isActive: true,
      isEmailVerified: true,
    },
  ];

  // Reuse the admin password for these disposable development accounts.
  // Do not use these accounts for real users.
  const players = [];

  for (const data of playerData) {
    const player = await upsertUser({
      ...data,
      passwordHash,
    });

    players.push(player);
  }

  const now = new Date();

  const events = [];

  const eventData = [
    {
      title: "LeagueOps CODM Tournament",
      game: "CODM",
      type: "Tournament",
      season: "Seed Season 1",
      description: "Development data for testing event registration.",
      venue: "NU MOA Campus",
      eventStartDate: new Date(now.getTime() + 7 * 86400000),
      eventEndDate: new Date(now.getTime() + 8 * 86400000),
      registrationOpenDate: now,
      registrationClosedDate: new Date(now.getTime() + 5 * 86400000),
      registrationMode: "Team",
      playersPerTeam: 5,
      maxSlots: 8,
      status: "upcoming",
      approvalStatus: "approved",
      reviewedBy: admin._id,
      reviewedAt: now,
      isSchedulePublished: true,
      isBracketPublished: false,
      isArchived: false,
      createdBy: admin._id,
    },
    {
      title: "LeagueOps MLBB Tournament",
      game: "MLBB",
      type: "Tournament",
      season: "Seed Season 1",
      description: "Sample MLBB event for development and testing.",
      venue: "NU MOA Campus",
      eventStartDate: new Date(now.getTime() + 14 * 86400000),
      eventEndDate: new Date(now.getTime() + 15 * 86400000),
      registrationOpenDate: now,
      registrationClosedDate: new Date(now.getTime() + 12 * 86400000),
      registrationMode: "Team",
      playersPerTeam: 5,
      maxSlots: 8,
      status: "upcoming",
      approvalStatus: "approved",
      reviewedBy: admin._id,
      reviewedAt: now,
      isSchedulePublished: false,
      isBracketPublished: false,
      isArchived: false,
      createdBy: admin._id,
    },
    {
      title: "LeagueOps Tekken 8 Tournament",
      game: "Tekken 8",
      type: "Tournament",
      season: "Seed Season 1",
      description: "Sample individual tournament for development testing.",
      venue: "NU MOA Campus",
      eventStartDate: new Date(now.getTime() + 21 * 86400000),
      eventEndDate: new Date(now.getTime() + 21 * 86400000),
      registrationOpenDate: now,
      registrationClosedDate: new Date(now.getTime() + 19 * 86400000),
      registrationMode: "Individual",
      playersPerTeam: 1,
      maxSlots: 16,
      status: "upcoming",
      approvalStatus: "pending",
      isSchedulePublished: false,
      isBracketPublished: false,
      isArchived: false,
      createdBy: admin._id,
    },
  ];

  for (const data of eventData) {
    events.push(await upsertEvent(data));
  }

  const codmEvent = events[0];

  const registrationA = await upsertRegistration({
    eventId: codmEvent._id,
    submittedBy: players[0]._id,
    teamName: "Seed Team Alpha",
    division: "Open",
    rankDetails: "Legendary",
    playerDetails: [
      {
        userId: players[0]._id,
        studentId: players[0].studentId,
        firstName: players[0].firstName,
        lastName: players[0].lastName,
        inGameName: players[0].inGameName,
      },
      {
        userId: players[1]._id,
        studentId: players[1].studentId,
        firstName: players[1].firstName,
        lastName: players[1].lastName,
        inGameName: players[1].inGameName,
      },
    ],
    status: "accepted",
  });

  await upsertRegistration({
    eventId: codmEvent._id,
    submittedBy: players[2]._id,
    teamName: "Seed Team Bravo",
    division: "Open",
    rankDetails: "Grandmaster",
    playerDetails: [
      {
        userId: players[2]._id,
        studentId: players[2].studentId,
        firstName: players[2].firstName,
        lastName: players[2].lastName,
        inGameName: players[2].inGameName,
      },
    ],
    status: "pending",
  });

  await upsertMatch({
    eventId: codmEvent._id,
    matchNumber: 1,
    round: "Round 1",
    stage: "Opening Match",
    teamA: registrationA.teamName,
    teamB: "Seed Team Bravo",
    scheduledDate: codmEvent.eventStartDate,
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled",
    createdBy: admin._id,
  });

  console.log("Seed completed successfully.");
  console.log(`Admin email: ${admin.studentEmail}`);
  console.log(`Events: ${events.length}`);
  console.log("Registrations: 2");
  console.log("Matches: 1");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
