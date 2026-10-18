import mongoose from "mongoose";

export const STATUSES = ["upcoming", "live", "completed"];

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

    teamA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },
    teamB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },

    scheduledDate: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },

    status: {
      type: String,
      enum: STATUSES,
      default: "upcoming",
      index: true,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },
    scoreA: { type: Number, min: 0, default: 0 },
    scoreB: { type: Number, min: 0, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

matchSchema.index({ eventId: 1, matchNumber: 1 }, { unique: true });

export default mongoose.model("Match", matchSchema);
