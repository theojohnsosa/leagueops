import mongoose from "mongoose";

export const STATUSES = ["pending", "accepted", "rejected", "cancelled"];

// ASSUMPTION: ERD only says "Array". Each player needs an identifier so the
// rules engine can detect a player already on an accepted team.
const playerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    studentId: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    inGameName: { type: String, trim: true },
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teamName: { type: String, required: true, trim: true },
    division: { type: String, trim: true },
    rankDetails: { type: String, trim: true },
    playerDetails: { type: [playerSchema], default: [] },
    status: { type: String, enum: STATUSES, default: "pending", index: true },
    rejectionReason: { type: String, trim: true },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

registrationSchema.index({ eventId: 1, status: 1 });

export default mongoose.model("Registration", registrationSchema);
