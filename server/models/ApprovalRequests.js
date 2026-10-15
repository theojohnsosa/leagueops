import mongoose from "mongoose";

export const STATUSES = ["pending", "approved", "rejected"];

const approvalRequestSchema = new mongoose.Schema(
  {
    // e.g. 'event', 'archive', 'restore' (ASSUMPTION: free-form for now)
    type: { type: String, required: true, trim: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, trim: true },
    status: { type: String, enum: STATUSES, default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("ApprovalRequest", approvalRequestSchema);
