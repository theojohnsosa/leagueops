import mongoose from "mongoose";

// 10th model (not in the ERD): stores tokens for /verify-email/:token (24 hour links).
const emailVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Delete tokens 7 days AFTER they expire, not at expiry, so the API can still
// tell TOKEN_EXPIRED apart from TOKEN_INVALID.
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export default mongoose.model("EmailVerification", emailVerificationSchema);
