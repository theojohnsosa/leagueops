import bcrypt from "bcryptjs";
import { User, EmailVerification, PasswordReset } from "../models/Index.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  generateToken,
  hashToken,
  setAuthCookie,
  clearAuthCookie,
} from "../utils/tokens.js";
import { sendAuthEmail } from "../utils/mailer.js";

const EMAIL_DOMAIN = (
  process.env.ALLOWED_EMAIL_DOMAIN || "students.nu-moa.edu.ph"
)
  .trim()
  .toLowerCase()
  .replace(/^@/, "");

const VERIFICATION_HOURS = 24;
const RESET_HOURS = 1;
const RESEND_COOLDOWN_MS = 60 * 1000;

const VERIFICATION_MESSAGE =
  "If an eligible account needs verification, a verification email will be sent.";
const RESET_MESSAGE =
  "If an account matches that email, a password reset link will be sent.";

function splitFullName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function publicUser(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    studentEmail: user.studentEmail,
    studentId: user.studentId,
    department: user.department,
    inGameName: user.inGameName,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
  };
}

function validationError(message, fields = {}) {
  return new AppError(400, "VALIDATION_ERROR", message, fields);
}

function validateStudentEmail(email) {
  const suffix = `@${EMAIL_DOMAIN}`;

  if (!email || !email.includes("@")) {
    throw validationError("Enter a valid student email.", {
      studentEmail: "Enter a valid student email.",
    });
  }

  if (!email.endsWith(suffix)) {
    throw validationError(
      `Use your university email address ending in ${suffix}.`,
      {
        studentEmail: `Email must end in ${suffix}.`,
      },
    );
  }
}

function makeExpiry(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function buildClientUrl(path) {
  const base = process.env.CLIENT_URL?.trim();

  if (!base) {
    throw new Error("CLIENT_URL is not configured.");
  }

  return `${base.replace(/\/+$/, "")}${path}`;
}

async function createVerification(user) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const verificationUrl = buildClientUrl(
    `/verify-email/${encodeURIComponent(token)}`,
  );

  const verification = await EmailVerification.create({
    userId: user._id,
    tokenHash,
    expiresAt: makeExpiry(VERIFICATION_HOURS),
  });

  try {
    await sendAuthEmail({
      to: user.studentEmail,
      subject: "Verify your LeagueOps account",
      text: [
        `Hello ${user.firstName},`,
        "",
        "Verify your LeagueOps account using this link:",
        verificationUrl,
        "",
        `This link expires in ${VERIFICATION_HOURS} hours.`,
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Verify your LeagueOps account using the link below:</p>
        <p><a href="${verificationUrl}">Verify my account</a></p>
        <p>This link expires in ${VERIFICATION_HOURS} hours.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  } catch (error) {
    await EmailVerification.deleteOne({ _id: verification._id }).catch(
      (cleanupError) => {
        console.error(
          "Failed to clean up an unsent verification token:",
          cleanupError.message,
        );
      },
    );

    throw error;
  }

  // Preserve the previous token until the replacement email has been sent.
  await EmailVerification.deleteMany({
    userId: user._id,
    _id: { $ne: verification._id },
  });

  return verification;
}

async function createPasswordReset(user) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const resetUrl = buildClientUrl(
    `/reset-password/${encodeURIComponent(token)}`,
  );

  const reset = await PasswordReset.create({
    userId: user._id,
    tokenHash,
    expiresAt: makeExpiry(RESET_HOURS),
  });

  try {
    await sendAuthEmail({
      to: user.studentEmail,
      subject: "Reset your LeagueOps password",
      text: [
        `Hello ${user.firstName},`,
        "",
        "Use this link to reset your LeagueOps password:",
        resetUrl,
        "",
        `This link expires in ${RESET_HOURS} hour.`,
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Use the link below to reset your LeagueOps password:</p>
        <p><a href="${resetUrl}">Reset my password</a></p>
        <p>This link expires in ${RESET_HOURS} hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  } catch (error) {
    await PasswordReset.deleteOne({ _id: reset._id }).catch((cleanupError) => {
      console.error(
        "Failed to clean up an unsent password-reset token:",
        cleanupError.message,
      );
    });

    throw error;
  }

  // Only invalidate earlier reset links after the new email is sent.
  await PasswordReset.updateMany(
    {
      userId: user._id,
      _id: { $ne: reset._id },
      usedAt: { $exists: false },
    },
    { $set: { usedAt: new Date() } },
  );

  return reset;
}

export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, studentId, password, department, inGameName } =
    req.body || {};

  const studentEmail = normalizeEmail(email);
  const normalizedStudentId = String(studentId || "").trim();
  const normalizedFullName = String(fullName || "").trim();

  if (!normalizedFullName) {
    throw validationError("Full name is required.", {
      fullName: "Full name is required.",
    });
  }

  if (!studentEmail) {
    throw validationError("Student email is required.", {
      studentEmail: "Student email is required.",
    });
  }

  validateStudentEmail(studentEmail);

  if (!normalizedStudentId) {
    throw validationError("Student ID is required.", {
      studentId: "Student ID is required.",
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    throw validationError("Password must be at least 8 characters.", {
      password: "Password must be at least 8 characters.",
    });
  }

  const { firstName, lastName } = splitFullName(normalizedFullName);

  const existingByEmail = await User.findOne({ studentEmail });
  const existingByStudentId = await User.findOne({
    studentId: normalizedStudentId,
  });

  if (existingByEmail?.isEmailVerified) {
    throw new AppError(
      409,
      "EMAIL_TAKEN",
      "An account with this email already exists.",
    );
  }

  if (
    existingByStudentId &&
    String(existingByStudentId._id) !== String(existingByEmail?._id)
  ) {
    throw new AppError(
      409,
      "STUDENT_ID_TAKEN",
      "An account with this student ID already exists.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;

  if (existingByEmail) {
    // Reuse an unverified account so a user can correct or retry signup.
    existingByEmail.firstName = firstName;
    existingByEmail.lastName = lastName;
    existingByEmail.studentId = normalizedStudentId;
    existingByEmail.department = department?.trim() || "";
    existingByEmail.inGameName = inGameName?.trim() || "";
    existingByEmail.passwordHash = passwordHash;
    existingByEmail.role = "player";
    existingByEmail.isActive = true;
    existingByEmail.isEmailVerified = false;

    user = await existingByEmail.save();
  } else {
    user = await User.create({
      firstName,
      lastName,
      studentEmail,
      studentId: normalizedStudentId,
      department: department?.trim() || "",
      inGameName: inGameName?.trim() || "",
      passwordHash,
      role: "player",
      isActive: true,
      isEmailVerified: false,
    });
  }

  try {
    await createVerification(user);
  } catch (error) {
    console.error("Signup verification email failed:", error.message);

    throw new AppError(
      503,
      "EMAIL_SEND_FAILED",
      "Your account was saved, but the verification email could not be sent. Please try resending the verification email.",
    );
  }

  return res.status(201).json({
    message:
      "Account created. Check your university email to verify your account.",
    user: publicUser(user),
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "").trim();

  if (!token) {
    throw validationError("Verification token is required.", {
      token: "Verification token is required.",
    });
  }

  const tokenHash = hashToken(token);
  const verification = await EmailVerification.findOne({
    tokenHash,
    usedAt: { $exists: false },
  });

  if (!verification) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "This verification link is invalid or has already been used.",
    );
  }

  if (verification.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      400,
      "TOKEN_EXPIRED",
      "This verification link has expired. Request a new one.",
    );
  }

  // Claim the token atomically so concurrent requests cannot both use it.
  const claimed = await EmailVerification.findOneAndUpdate(
    {
      _id: verification._id,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true },
  );

  if (!claimed) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "This verification link is invalid, expired, or has already been used.",
    );
  }

  try {
    const user = await User.findById(verification.userId);

    if (!user) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "The account associated with this link no longer exists.",
      );
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    await EmailVerification.deleteMany({
      userId: user._id,
      _id: { $ne: verification._id },
    });

    return res.json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    // Allow retry if the database update failed after claiming the token.
    await EmailVerification.updateOne(
      { _id: verification._id, usedAt: claimed.usedAt },
      { $unset: { usedAt: "" } },
    ).catch((rollbackError) => {
      console.error(
        "Failed to release verification token after an error:",
        rollbackError.message,
      );
    });

    throw error;
  }
});

export const resendVerification = asyncHandler(async (req, res) => {
  const studentEmail = normalizeEmail(req.body?.email);

  if (!studentEmail) {
    return res.json({ message: VERIFICATION_MESSAGE });
  }

  const user = await User.findOne({ studentEmail });

  if (!user || user.isEmailVerified || !user.isActive) {
    return res.json({ message: VERIFICATION_MESSAGE });
  }

  const latestVerification = await EmailVerification.findOne({
    userId: user._id,
  }).sort({ createdAt: -1 });

  if (
    latestVerification &&
    Date.now() - latestVerification.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    throw new AppError(
      429,
      "RESEND_COOLDOWN",
      "Please wait before requesting another verification email.",
    );
  }

  try {
    await createVerification(user);
  } catch (error) {
    console.error("Resending verification email failed:", error.message);

    throw new AppError(
      503,
      "EMAIL_SEND_FAILED",
      "The verification email could not be sent. Please try again later.",
    );
  }

  return res.json({ message: VERIFICATION_MESSAGE });
});

export const login = asyncHandler(async (req, res) => {
  const studentEmail = normalizeEmail(
    req.body?.studentEmail || req.body?.email,
  );
  const { password } = req.body || {};

  if (!studentEmail || typeof password !== "string" || !password) {
    throw validationError("Email and password are required.", {
      email: "Email and password are required.",
    });
  }

  const user = await User.findOne({ studentEmail }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "ACCOUNT_DEACTIVATED",
      "This account is deactivated.",
    );
  }

  if (!user.isEmailVerified && process.env.SKIP_EMAIL_VERIFICATION !== "true") {
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Please confirm your email first.",
    );
  }

  setAuthCookie(res, user._id);

  return res.json({ user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  return res.json({ message: "Logged out successfully." });
});

export const getMe = asyncHandler(async (req, res) => {
  return res.json({ user: publicUser(req.user) });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { fullName, department, inGameName } = req.body || {};
  const updates = {};

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      throw validationError("Full name cannot be empty.", {
        fullName: "Full name cannot be empty.",
      });
    }

    Object.assign(updates, splitFullName(fullName));
  }

  if (department !== undefined) {
    if (typeof department !== "string") {
      throw validationError("Department must be text.", {
        department: "Department must be text.",
      });
    }

    updates.department = department.trim();
  }

  if (inGameName !== undefined) {
    if (typeof inGameName !== "string") {
      throw validationError("In-game name must be text.", {
        inGameName: "In-game name must be text.",
      });
    }

    updates.inGameName = inGameName.trim();
  }

  if (!Object.keys(updates).length) {
    throw validationError("Provide at least one field to update.");
  }

  Object.assign(req.user, updates);
  await req.user.save();

  return res.json({
    message: "Profile updated successfully.",
    user: publicUser(req.user),
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const studentEmail = normalizeEmail(req.body?.email);

  if (!studentEmail) {
    return res.json({ message: RESET_MESSAGE });
  }

  try {
    const user = await User.findOne({
      studentEmail,
      isActive: true,
      isEmailVerified: true,
    });

    if (user) {
      await createPasswordReset(user);
    }
  } catch (error) {
    // Do not reveal whether an account exists or whether email delivery failed.
    console.error("Password-reset request failed:", error.message);
  }

  return res.json({ message: RESET_MESSAGE });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const { password } = req.body || {};

  if (!token) {
    throw validationError("Password reset token is required.", {
      token: "Password reset token is required.",
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    throw validationError("Password must be at least 8 characters.", {
      password: "Password must be at least 8 characters.",
    });
  }

  const tokenHash = hashToken(token);
  const reset = await PasswordReset.findOne({
    tokenHash,
    usedAt: { $exists: false },
  });

  if (!reset) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "This password reset link is invalid or has already been used.",
    );
  }

  if (reset.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      400,
      "TOKEN_EXPIRED",
      "This password reset link has expired. Request a new one.",
    );
  }

  const claimed = await PasswordReset.findOneAndUpdate(
    {
      _id: reset._id,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true },
  );

  if (!claimed) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "This password reset link is invalid, expired, or has already been used.",
    );
  }

  try {
    const user = await User.findById(reset.userId).select("+passwordHash");

    if (!user) {
      throw new AppError(
        404,
        "USER_NOT_FOUND",
        "The account associated with this link no longer exists.",
      );
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    await PasswordReset.updateMany(
      {
        userId: user._id,
        _id: { $ne: reset._id },
        usedAt: { $exists: false },
      },
      { $set: { usedAt: new Date() } },
    );

    return res.json({
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    // If updating the user fails, release this token so the user can retry.
    await PasswordReset.updateOne(
      { _id: reset._id, usedAt: claimed.usedAt },
      { $unset: { usedAt: "" } },
    ).catch((rollbackError) => {
      console.error(
        "Failed to release password-reset token after an error:",
        rollbackError.message,
      );
    });

    throw error;
  }
});
