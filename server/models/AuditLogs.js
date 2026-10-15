import mongoose from "mongoose";

// Append-only: createdAt only, no updatedAt. The appendOnly plugin
// (utils) will block updates and deletes.
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorName: { type: String },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
