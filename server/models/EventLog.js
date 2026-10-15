import mongoose from "mongoose";

// Append-only: createdAt only, no updatedAt.
const eventLogSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    actorRole: { type: String },
    action: { type: String, required: true },
    description: { type: String },
    changes: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

eventLogSchema.index({ eventId: 1, createdAt: -1 });

export default mongoose.model("EventLog", eventLogSchema);
