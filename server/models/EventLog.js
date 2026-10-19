import mongoose from "mongoose";
import appendOnly from "../utils/appendOnly.js";

const eventLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: String,
    actorRole: String,
    action: {
      type: String,
      required: true,
    },
    description: String,
    changes: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

eventLogSchema.index({ eventId: 1, createdAt: -1 });

appendOnly(eventLogSchema);

export default mongoose.model("EventLog", eventLogSchema);
