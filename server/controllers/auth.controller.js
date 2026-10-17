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

const GENERIC_VERIFICATION_MESSAGE =
  "If this email needs confirmation, a new link was sent.";

const GENERIC_RESET_MESSAGE =
  "If this email is registered, a reset link was sent.";

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/);

  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function publicUser(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    studentEmail: user.studentEmail,
    studentId: user.studentId,
    department: user.department || "",
    inGameName: user.inGameName || "",
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
  };
}

function validationError(fields) {
  return new AppError(
    400,
    "VALIDATION_ERROR",
    "Please check the submitted fields.",
    fields,
  );
}

function validateStudentEmail(email) {
  const parts = email.split("@");

  return (
    parts.length === 2 &&
    parts[0].length > 0 &&
    parts[1] === EMAIL_DOMAIN &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

async function createVerification(user) {
  const token = generateToken();

  await EmailVerification.deleteMany({
    userId: user._id,
    usedAt: null,
  });

  await EmailVerification.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000),
  });

  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    throw new Error("CLIENT_URL is not configured.");
  }

  const link = `${clientUrl.replace(/\/+$/, "")}/verify-email/${token}`;

  await sendAuthEmail({
    to: user.studentEmail,
    subject: "Confirm your LeagueOps account",
    text: `Confirm your LeagueOps account using this link:\n${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Confirm your LeagueOps account:</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

async function createPasswordReset(user) {
  const token = generateToken();
  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    throw new Error("CLIENT_URL is not configured.");
  }

  // Invalidate outstanding reset links before issuing a replacement.
  await PasswordReset.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  await PasswordReset.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000),
  });

  const link = `${clientUrl.replace(/\/+$/, "")}/reset-password/${token}`;

  await sendAuthEmail({
    to: user.studentEmail,
    subject: "Reset your LeagueOps password",
    text: `Reset your LeagueOps password using this link:\n${link}\n\nThis link expires in one hour.`,
    html: `<p>Reset your LeagueOps password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in one hour.</p>`,
  });
}

// POST /api/auth/signup
export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, studentId, department, inGameName, password } =
    req.body ?? {};

  const fields = {};

  if (typeof fullName !== "string" || !fullName.trim()) {
    fields.fullName = "Full name is required.";
  }

  if (typeof email !== "string" || !email.trim()) {
    fields.email = "Email is required.";
  }

  if (typeof studentId !== "string" || !studentId.trim()) {
    fields.studentId = "Student ID is required.";
  }

  if (typeof password !== "string" || password.length < 8) {
    fields.password = "Password must be at least 8 characters.";
  }

  if (department !== undefined && typeof department !== "string") {
    fields.department = "Department must be text.";
  }

  if (inGameName !== undefined && typeof inGameName !== "string") {
    fields.inGameName = "In-game name must be text.";
  }

  if (Object.keys(fields).length) {
    throw validationError(fields);
  }

  const normalizedEmail = normalizeEmail(email);

  if (!validateStudentEmail(normalizedEmail)) {
    throw new AppError(
      400,
      "INVALID_EMAIL_DOMAIN",
      `Use your @${EMAIL_DOMAIN} email address.`,
      { email: `A valid @${EMAIL_DOMAIN} email is required.` },
    );
  }

  const { firstName, lastName } = splitFullName(fullName);

  if (!firstName || !lastName) {
    throw validationError({
      fullName: "Enter both your first and last name.",
    });
  }

  const normalizedStudentId = studentId.trim();

  const existingEmail = await User.findOne({
    studentEmail: normalizedEmail,
  });

  const existingStudentId = await User.findOne({
    studentId: normalizedStudentId,
  });

  if (existingEmail?.isEmailVerified) {
    throw new AppError(409, "EMAIL_TAKEN", "This email is already registered.");
  }

  if (
    existingStudentId &&
    String(existingStudentId._id) !== String(existingEmail?._id)
  ) {
    throw new AppError(
      409,
      "STUDENT_ID_TAKEN",
      "This student ID is already registered.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;

  if (existingEmail && !existingEmail.isEmailVerified) {
    existingEmail.firstName = firstName;
    existingEmail.lastName = lastName;
    existingEmail.studentId = normalizedStudentId;
    existingEmail.department = department?.trim() || "";
    existingEmail.inGameName = inGameName?.trim() || "";
    existingEmail.passwordHash = passwordHash;
    existingEmail.role = "player";
    existingEmail.isActive = true;

    user = await existingEmail.save();
  } else {
    user = await User.create({
      firstName,
      lastName,
      studentEmail: normalizedEmail,
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
    console.error("Failed to send verification email:", error.message);

    throw new AppError(
      503,
      "EMAIL_SEND_FAILED",
      "Your account was saved, but the verification email could not be sent. Try resending it.",
    );
  }

  res.status(201).json({
    message: "Check your email to confirm your account.",
    email: user.studentEmail,
  });
});

// POST /api/auth/verify-email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body ?? {};

  if (typeof token !== "string" || !token.trim()) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The verification link is invalid.",
    );
  }

  const tokenHash = hashToken(token);

  // Look up first so expired links can return TOKEN_EXPIRED.
  const existing = await EmailVerification.findOne({
    tokenHash,
    usedAt: null,
  });

  if (!existing) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The verification link is invalid.",
    );
  }

  if (existing.expiresAt <= new Date()) {
    throw new AppError(
      400,
      "TOKEN_EXPIRED",
      "The verification link has expired.",
    );
  }

  // Claim the token once, preventing concurrent reuse.
  const verification = await EmailVerification.findOneAndUpdate(
    {
      _id: existing._id,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true },
  );

  if (!verification) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The verification link is invalid or has already been used.",
    );
  }

  const user = await User.findById(verification.userId);

  if (!user) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The verification link is invalid.",
    );
  }

  user.isEmailVerified = true;
  await user.save();

  await EmailVerification.deleteMany({
    userId: user._id,
    _id: { $ne: verification._id },
  });

  res.json({
    message: "Email confirmed. You can now log in.",
  });
});

// POST /api/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.json({ message: GENERIC_VERIFICATION_MESSAGE });
  }

  const user = await User.findOne({
    studentEmail: email,
    isEmailVerified: false,
  });

  if (!user) {
    return res.json({ message: GENERIC_VERIFICATION_MESSAGE });
  }

  const latest = await EmailVerification.findOne({
    userId: user._id,
  }).sort({ createdAt: -1 });

  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError(
      429,
      "TOO_MANY_REQUESTS",
      "Please wait 60 seconds before requesting another verification link.",
    );
  }

  try {
    await createVerification(user);
  } catch (error) {
    console.error("Failed to resend verification email:", error.message);

    throw new AppError(
      503,
      "EMAIL_SEND_FAILED",
      "The verification email could not be sent. Please try again later.",
    );
  }

  res.json({ message: GENERIC_VERIFICATION_MESSAGE });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  const fields = {};

  if (!email) {
    fields.email = "Email is required.";
  }

  if (typeof password !== "string" || !password) {
    fields.password = "Password is required.";
  }

  if (Object.keys(fields).length) {
    throw validationError(fields);
  }

  const user = await User.findOne({
    studentEmail: email,
  }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "ACCOUNT_DEACTIVATED",
      "This account is deactivated.",
    );
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Please confirm your email first.",
    );
  }

  setAuthCookie(res, user._id);

  res.json({
    user: publicUser(user),
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  res.json({ message: "Logged out." });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({
    user: publicUser(req.user),
  });
});

// PATCH /api/auth/me
export const updateMe = asyncHandler(async (req, res) => {
  const { fullName, department, inGameName } = req.body ?? {};
  const fields = {};

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      fields.fullName = "Enter your first and last name.";
    } else {
      const { firstName, lastName } = splitFullName(fullName);

      if (!firstName || !lastName) {
        fields.fullName = "Enter your first and last name.";
      } else {
        req.user.firstName = firstName;
        req.user.lastName = lastName;
      }
    }
  }

  if (department !== undefined) {
    if (typeof department !== "string") {
      fields.department = "Department must be text.";
    } else {
      req.user.department = department.trim();
    }
  }

  if (inGameName !== undefined) {
    if (typeof inGameName !== "string") {
      fields.inGameName = "In-game name must be text.";
    } else {
      req.user.inGameName = inGameName.trim();
    }
  }

  if (Object.keys(fields).length) {
    throw validationError(fields);
  }

  if (
    fullName === undefined &&
    department === undefined &&
    inGameName === undefined
  ) {
    throw validationError({
      body: "Provide at least one profile field to update.",
    });
  }

  await req.user.save();

  res.json({
    user: publicUser(req.user),
  });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.json({ message: GENERIC_RESET_MESSAGE });
  }

  const user = await User.findOne({
    studentEmail: email,
    isActive: true,
    isEmailVerified: true,
  });

  if (user) {
    try {
      await createPasswordReset(user);
    } catch (error) {
      // Do not reveal account existence or mail delivery status to the caller.
      console.error("Failed to send password reset email:", error.message);
    }
  }

  res.json({ message: GENERIC_RESET_MESSAGE });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body ?? {};

  if (typeof password !== "string" || password.length < 8) {
    throw validationError({
      password: "Password must be at least 8 characters.",
    });
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The password reset link is invalid.",
    );
  }

  const tokenHash = hashToken(token);

  const existing = await PasswordReset.findOne({
    tokenHash,
    usedAt: null,
  });

  if (!existing) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The password reset link is invalid.",
    );
  }

  if (existing.expiresAt <= new Date()) {
    throw new AppError(
      400,
      "TOKEN_EXPIRED",
      "The password reset link has expired.",
    );
  }

  // Claim the token so two concurrent requests cannot both use it.
  const reset = await PasswordReset.findOneAndUpdate(
    {
      _id: existing._id,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true },
  );

  if (!reset) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The password reset link is invalid or has already been used.",
    );
  }

  const user = await User.findById(reset.userId);

  if (!user) {
    throw new AppError(
      400,
      "TOKEN_INVALID",
      "The password reset link is invalid.",
    );
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();

  await PasswordReset.updateMany(
    {
      userId: user._id,
      _id: { $ne: reset._id },
      usedAt: null,
    },
    { $set: { usedAt: new Date() } },
  );

  res.json({
    message: "Password updated. You can now log in.",
  });
});
