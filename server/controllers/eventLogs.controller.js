
import mongoose from "mongoose";
import EventLog from "../models/EventLog.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getEventLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
  );

  const filter = {};

  if (req.query.eventId) {
    if (!mongoose.isValidObjectId(req.query.eventId)) {
      throw new AppError(400, "INVALID_ID", "Invalid event ID.");
    }

    filter.eventId = req.query.eventId;
  }

  if (req.query.action) {
    filter.action = req.query.action;
  }

  const [logs, total] = await Promise.all([
    EventLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EventLog.countDocuments(filter),
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
