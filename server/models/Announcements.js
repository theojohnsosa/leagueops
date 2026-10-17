import mongoose from "mongoose";

export const STATUSES = ["draft", "published", "archived"];

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["general", "event", "schedule", "result", "urgent"],
      default: "general",
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "draft",
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.model("Announcement", announcementSchema);
