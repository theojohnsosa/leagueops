import mongoose from "mongoose";

export const STATUSES = ["scheduled", "ongoing", "completed", "cancelled"];

const matchSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    matchNumber: { type: Number, required: true, min: 1 },
    round: { type: String, trim: true },
    stage: { type: String, trim: true },

    // Team NAMES, matched against accepted registrations by the controller.
    teamA: { type: String, trim: true },
    teamB: { type: String, trim: true },

    scheduledDate: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },

    status: {
      type: String,
      enum: STATUSES,
      default: "scheduled",
      index: true,
    },

    // The winner IS a Registration id (the controller populates teamName).
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },

    // No default, so "no score yet" can be told apart from 0 - 0.
    scoreA: { type: Number, min: 0 },
    scoreB: { type: Number, min: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

matchSchema.index({ eventId: 1, matchNumber: 1 }, { unique: true });

export default mongoose.model("Match", matchSchema);