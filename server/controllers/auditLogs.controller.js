
import mongoose from "mongoose";
import AuditLog from "../models/AuditLogs.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
  );

  const filter = {};

  if (req.query.action) {
    filter.action = req.query.action;
  }

  if (req.query.targetType) {
    filter.targetType = req.query.targetType;
  }

  if (req.query.targetId) {
    if (!mongoose.isValidObjectId(req.query.targetId)) {
      throw new AppError(400, "INVALID_ID", "Invalid target ID.");
    }

    filter.targetId = req.query.targetId;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
