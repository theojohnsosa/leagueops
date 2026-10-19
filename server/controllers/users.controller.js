import { User } from "../models/Index.js";
import AuditLog from "../models/AuditLogs.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const ALLOWED_ROLES = ["admin", "head", "committee", "player"];

function publicUser(user) {
  const data = typeof user.toObject === "function" ? user.toObject() : user;

  return {
    _id: data._id,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName:
      data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
    studentEmail: data.studentEmail,
    studentId: data.studentId,
    department: data.department,
    inGameName: data.inGameName,
    role: data.role,
    isActive: data.isActive,
    isEmailVerified: data.isEmailVerified,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function writeAuditLog({ req, action, targetUser, description }) {
  await AuditLog.create({
    actorId: req.user._id,
    actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
    actorRole: req.user.role,
    action,
    targetType: "User",
    targetId: targetUser._id,
    description,
  });
}

function validateObjectId(id) {
  if (!/^[a-f\d]{24}$/i.test(String(id || ""))) {
    throw new AppError(400, "INVALID_USER_ID", "Invalid user ID.");
  }
}

export const getUsers = asyncHandler(async (req, res) => {
  const { search = "", role, status, page = "1", limit = "20" } = req.query;

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

  const filter = {};

  if (role) {
    if (!ALLOWED_ROLES.includes(role)) {
      throw new AppError(400, "INVALID_ROLE", "Invalid role filter.");
    }

    filter.role = role;
  }

  if (status) {
    if (!["active", "inactive"].includes(status)) {
      throw new AppError(
        400,
        "INVALID_STATUS",
        "Status must be active or inactive.",
      );
    }

    filter.isActive = status === "active";
  }

  const searchTerm = String(search).trim();

  if (searchTerm) {
    // Escape user input so it is treated as literal text, not a regex pattern.
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(escapedSearch, "i");

    filter.$or = [
      { firstName: expression },
      { lastName: expression },
      { studentEmail: expression },
      { studentId: expression },
      { inGameName: expression },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    User.countDocuments(filter),
  ]);

  return res.json({
    users: users.map(publicUser),
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const user = await User.findById(req.params.id).select("-passwordHash");

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  return res.json({ user: publicUser(user) });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const { role } = req.body || {};

  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError(400, "INVALID_ROLE", "Select a valid user role.");
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  if (String(user._id) === String(req.user._id)) {
    throw new AppError(
      400,
      "SELF_ROLE_CHANGE",
      "You cannot change your own role.",
    );
  }

  const previousRole = user.role;

  if (previousRole === role) {
    return res.json({
      message: "The user already has this role.",
      user: publicUser(user),
    });
  }

  user.role = role;
  await user.save();

  try {
    await writeAuditLog({
      req,
      action: "USER_ROLE_UPDATED",
      targetUser: user,
      description: `Changed role from ${previousRole} to ${role}.`,
    });
  } catch (error) {
    // The role update succeeded; report the logging failure without
    // pretending the user update was rolled back.
    console.error("Failed to write user role audit log:", error.message);
  }

  return res.json({
    message: "User role updated successfully.",
    user: publicUser(user),
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id);

  const { isActive } = req.body || {};

  if (typeof isActive !== "boolean") {
    throw new AppError(
      400,
      "INVALID_STATUS",
      "isActive must be true or false.",
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  if (String(user._id) === String(req.user._id) && !isActive) {
    throw new AppError(
      400,
      "SELF_DEACTIVATION",
      "You cannot deactivate your own account.",
    );
  }

  const previousStatus = user.isActive;

  if (previousStatus === isActive) {
    return res.json({
      message: `The account is already ${isActive ? "active" : "inactive"}.`,
      user: publicUser(user),
    });
  }

  user.isActive = isActive;
  await user.save();

  try {
    await writeAuditLog({
      req,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      targetUser: user,
      description: `Changed account status from ${
        previousStatus ? "active" : "inactive"
      } to ${isActive ? "active" : "inactive"}.`,
    });
  } catch (error) {
    console.error("Failed to write user status audit log:", error.message);
  }

  return res.json({
    message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
    user: publicUser(user),
  });
});
