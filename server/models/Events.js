import mongoose from "mongoose";

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"];
export const STATUSES = ["draft", "published", "ongoing", "completed"];
export const ARCHIVE_STATUSES = ["active", "archived", "expired"];

const standingsSchema = new mongoose.Schema(
  {
    champion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },
    firstRunnerUp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },
    secondRunnerUp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
    },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    game: {
      type: String,
      required: true,
      enum: ["CODM", "MLBB", "Valorant", "Tekken 8", "League of Legends"],
    },
    type: {
      type: String,
      enum: ["tournament", "tryout", "campus_event"],
    },
    season: { type: String, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, trim: true },

    eventStartDate: { type: Date, required: true },
    eventEndDate: { type: Date, required: true },
    registrationOpenDate: { type: Date, required: true },
    registrationCloseDate: { type: Date, required: true },

    registrationMode: {
      type: String,
      enum: ["team", "individual"],
    },
    playersPerTeam: { type: Number, min: 1 },
    maxSubstitutes: { type: Number, min: 0, default: 0 },
    maxSlots: { type: Number, min: 1 },

    status: {
      type: String,
      enum: STATUSES,
      default: "draft",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "pending",
      index: true,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },

    isSchedulePublished: { type: Boolean, default: false },
    isBracketPublished: { type: Boolean, default: false },
    standings: { type: standingsSchema, default: () => ({}) },

    isArchived: { type: Boolean, default: false, index: true },
    archiveStatus: {
      type: String,
      enum: ARCHIVE_STATUSES,
      default: "active",
      index: true,
    },
    archivedAt: { type: Date },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archiveReason: { type: String, trim: true },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, minimize: false },
);

eventSchema.index({ season: 1, title: 1 }, { unique: true, sparse: true });

export default mongoose.model("Event", eventSchema);
