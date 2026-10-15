import mongoose from "mongoose";

// Roles from docs/api/README.md conventions.
export const ROLES = ["admin", "head", "committee", "player"];

const userSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    // Domain (@students.nu-moa.edu.ph) is checked in the signup controller.
    studentEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    department: { type: String, trim: true },
    inGameName: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "player" },
    isActive: { type: Boolean, default: true },
    // Added for the email verification flow (auth.md).
    isEmailVerified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

// Convenience for the API: the "fullName" shown in the UI.
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

export default mongoose.model("User", userSchema);
