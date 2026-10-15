import mongoose from "mongoose";

// ASSUMPTION: match lifecycle values.
export const STATUSES = ["scheduled", "ongoing", "completed", "cancelled"];

const matchSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    matchNumber: { type: Number },
    round: { type: String, trim: true },
    // ERD says ObjectId (Registrations); treated here as a String label
    // (e.g. "Group A", "Finals"). Confirm.
    stage: { type: String, trim: true },
    // ERD says String. Team names for now; could become Registration refs.
    teamA: { type: String, trim: true },
    teamB: { type: String, trim: true },
    scheduledDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    status: { type: String, enum: STATUSES, default: "scheduled" },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "Registration" },
    scoreA: { type: Number, min: 0 },
    scoreB: { type: Number, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

matchSchema.index({ eventId: 1, matchNumber: 1 });

export default mongoose.model("Match", matchSchema);
