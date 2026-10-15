import mongoose from "mongoose";

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"];
// ASSUMPTION: event lifecycle values. Adjust to match your docs.
export const STATUSES = ["draft", "upcoming", "ongoing", "completed", "cancelled"];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    game: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    season: { type: String, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, trim: true },
    eventStartDate: { type: Date },
    eventEndDate: { type: Date },
    registrationOpenDate: { type: Date },
    registrationClosedDate: { type: Date },
    registrationMode: { type: String, trim: true },
    playersPerTeam: { type: Number, min: 1 },
    maxSlots: { type: Number, min: 1 },
    status: { type: String, enum: STATUSES, default: "draft", index: true },
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
    isSchedulePublished: { type: Boolean, default: false },
    isBracketPublished: { type: Boolean, default: false },
    standings: { type: mongoose.Schema.Types.Mixed, default: {} },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archiveReason: { type: String, trim: true },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model("Event", eventSchema);
