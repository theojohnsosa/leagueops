import mongoose from "mongoose";
import Event from "../models/Events.js";
import ApprovalRequest from "../models/ApprovalRequests.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/approvals
export const getApprovalRequests = asyncHandler(async (req, res) => {
  const requests = await ApprovalRequest.find({
    type: "event",
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

export const reviewEventApproval = asyncHandler(async (req, res) => {
  const { decision, reviewNote } = req.body;

  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError(
      400,
      "INVALID_APPROVAL_ID",
      "Invalid approval request ID.",
    );
  }

  if (!["approved", "rejected"].includes(decision)) {
    throw new AppError(
      400,
      "INVALID_DECISION",
      'Decision must be "approved" or "rejected".',
    );
  }

  if (reviewNote !== undefined && typeof reviewNote !== "string") {
    throw new AppError(
      400,
      "INVALID_REVIEW_NOTE",
      "Review note must be a string.",
    );
  }

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const request = await ApprovalRequest.findOne({
        _id: req.params.id,
        type: "event",
        status: "pending",
      }).session(session);

      if (!request) {
        throw new AppError(
          404,
          "PENDING_APPROVAL_NOT_FOUND",
          "Pending event approval request not found.",
        );
      }

      const event = await Event.findOne({
        _id: request.targetId,
        approvalStatus: "pending",
      }).session(session);

      if (!event) {
        throw new AppError(
          409,
          "EVENT_NOT_PENDING",
          "The event no longer awaits approval.",
        );
      }

      if (event.isArchived) {
        throw new AppError(
          409,
          "EVENT_ARCHIVED",
          "Archived events cannot be reviewed.",
        );
      }

      const reviewedAt = new Date();
      const note = typeof reviewNote === "string" ? reviewNote.trim() : "";

      request.status = decision;
      request.reviewedBy = req.user._id;
      request.reviewedAt = reviewedAt;
      request.reviewNote = note;

      event.approvalStatus = decision;
      event.reviewedBy = req.user._id;
      event.reviewedAt = reviewedAt;
      event.reviewNote = note;

      if (decision === "approved" && event.status === "draft") {
        event.status = "upcoming";
      }

      await event.save({ session });
      await request.save({ session });

      result = {
        event: event.toObject(),
        approvalRequest: request.toObject(),
      };
    });
  } finally {
    await session.endSession();
  }

  res.status(200).json({
    success: true,
    message: `Event ${decision} successfully.`,
    data: result,
  });
});
