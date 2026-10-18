import mongoose from "mongoose";

export const STATUSES = ["pending", "approved", "rejected"];
export const TYPES = ["event", "user_deactivation"];

const approvalRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: TYPES,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: STATUSES,
      default: "pending",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("ApprovalRequest", approvalRequestSchema);
