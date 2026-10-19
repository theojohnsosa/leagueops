import mongoose from "mongoose";

export const STATUSES = ["accepted", "rejected", "cancelled"];

const playerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
    },
    inGameName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teamName: {
      type: String,
      trim: true,
    },
    division: {
      type: String,
      enum: ["boys", "girls"],
    },
    rankDetails: {
      type: String,
      trim: true,
    },
    players: {
      type: [playerSchema],
      default: [],
    },
    substitutes: {
      type: [playerSchema],
      default: [],
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "accepted",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

registrationSchema.index({ eventId: 1, status: 1 });

export default mongoose.model("Registration", registrationSchema);
