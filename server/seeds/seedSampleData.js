
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import User from "../models/Users.js";
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import Match from "../models/Matches.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, "../.env") });

async function seedSampleData() {
  const mongoUri = process.env.SEED_MONGO_URI;
  const samplePassword = process.env.SEED_SAMPLE_PASSWORD;

  if (!mongoUri || !samplePassword) {
    throw new Error(
      "Set SEED_MONGO_URI and SEED_SAMPLE_PASSWORD in server/.env."
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Sample seeding is disabled in production.");
  }

  const parsedUri = new URL(mongoUri);
  const databaseName = decodeURIComponent(
    parsedUri.pathname.replace(/^\/+/, "")
  ).split("?")[0];

    if (databaseName !== "leagueops_seed_test") {
    throw new Error(
        "Seeding is allowed only on leagueops_seed_test."
    );
    }

  await mongoose.connect(mongoUri);

  try {
    const passwordHash = await bcrypt.hash(samplePassword, 12);

    const sampleUsers = [
      {
        studentId: "SEED-1001",
        firstName: "Alex",
        lastName: "Santos",
        studentEmail: "alex.seed@students.nu-moa.edu.ph",
        department: "Information Technology",
        inGameName: "AlexOne",
        role: "admin",
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
      {
        studentId: "SEED-1002",
        firstName: "Jamie",
        lastName: "Reyes",
        studentEmail: "jamie.seed@students.nu-moa.edu.ph",
        department: "Computer Science",
        inGameName: "JamiePlays",
        role: "player",
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
      {
        studentId: "SEED-1003",
        firstName: "Taylor",
        lastName: "Cruz",
        studentEmail: "taylor.seed@students.nu-moa.edu.ph",
        department: "Information Technology",
        inGameName: "TaylorGG",
        role: "player",
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
    ];

    const users = {};

    for (const data of sampleUsers) {
      users[data.studentId] = await User.findOneAndUpdate(
        { studentId: data.studentId },
        { $set: data },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    const eventData = [
      {
        title: "Sample MLBB Tournament",
        game: "Mobile Legends: Bang Bang",
        type: "Tournament",
        season: "SEED-2026",
        description: "Sample event for local development and testing.",
        venue: "Sample Venue",
        playersPerTeam: 5,
        maxSlots: 8,
        status: "upcoming",
        approvalStatus: "approved",
        reviewedBy: users["SEED-1001"]._id,
        reviewedAt: new Date(),
        createdBy: users["SEED-1001"]._id,
      },
      {
        title: "Sample Tekken Tournament",
        game: "Tekken 8",
        type: "Tournament",
        season: "SEED-2026",
        description: "Sample fighting-game event for local testing.",
        venue: "Sample Venue",
        playersPerTeam: 1,
        maxSlots: 16,
        status: "draft",
        approvalStatus: "pending",
        createdBy: users["SEED-1001"]._id,
      },
    ];

    const events = {};

    for (const data of eventData) {
      events[data.title] = await Event.findOneAndUpdate(
        { title: data.title, season: data.season },
        { $set: data },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    const mlbbEvent = events["Sample MLBB Tournament"];

    const registrationData = {
      eventId: mlbbEvent._id,
      submittedBy: users["SEED-1002"]._id,
      teamName: "Sample Team Alpha",
      division: "Open",
      rankDetails: "Sample rank details",
      playerDetails: [
        {
          userId: users["SEED-1002"]._id,
          studentId: users["SEED-1002"].studentId,
          firstName: users["SEED-1002"].firstName,
          lastName: users["SEED-1002"].lastName,
          inGameName: users["SEED-1002"].inGameName,
        },
        {
          userId: users["SEED-1003"]._id,
          studentId: users["SEED-1003"].studentId,
          firstName: users["SEED-1003"].firstName,
          lastName: users["SEED-1003"].lastName,
          inGameName: users["SEED-1003"].inGameName,
        },
      ],
      status: "pending",
    };

    const registration = await Registration.findOneAndUpdate(
      {
        eventId: mlbbEvent._id,
        teamName: registrationData.teamName,
      },
      { $set: registrationData },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    await Match.findOneAndUpdate(
      { eventId: mlbbEvent._id, matchNumber: 1 },
      {
        $set: {
          eventId: mlbbEvent._id,
          matchNumber: 1,
          round: "Round 1",
          stage: "Group A",
          teamA: "Sample Team Alpha",
          teamB: "Sample Team Beta",
          scheduledDate: new Date("2026-12-01T09:00:00.000Z"),
          startTime: "17:00",
          endTime: "18:00",
          status: "scheduled",
          createdBy: users["SEED-1001"]._id,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("Sample data seeded successfully.");
    console.log({
      users: Object.keys(users).length,
      events: Object.keys(events).length,
      registrations: 1,
      matches: 1,
      registrationId: registration._id.toString(),
    });
  } finally {
    await mongoose.disconnect();
  }
}

seedSampleData().catch(async (error) => {
  console.error("Sample data seeding failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
