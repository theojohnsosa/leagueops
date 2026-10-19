import mongoose from "mongoose";
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import ApprovalRequest from "../models/ApprovalRequests.js";
import Match from "../models/Matches.js";
import EventLog from "../models/EventLog.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAudit, logEvent } from "../utils/logger.js";
import { publicEventFilter } from "../utils/visibility.js";

const EVENT_FIELDS = [
  "title",
  "game",
  "type",
  "season",
  "description",
  "venue",
  "eventStartDate",
  "eventEndDate",
  "registrationOpenDate",
  "registrationClosedDate",
  "registrationMode",
  "playersPerTeam",
  "maxSlots",
];

function pickEventFields(body = {}) {
  return Object.fromEntries(
    EVENT_FIELDS.filter((field) => Object.hasOwn(body, field)).map((field) => [
      field,
      body[field],
    ]),
  );
}

function validateEventId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "INVALID_ID", "Invalid event ID.");
  }
}

function actorId(user) {
  return user?._id;
}

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalEvents,
    totalRegistrations,
    activeEvents,
    pendingApprovals,
    recentActivity,
    upcomingMatches,
    events,
    registrationStats,
  ] = await Promise.all([
    Event.countDocuments({ isArchived: { $ne: true } }),
    Registration.countDocuments(),
    Event.countDocuments({
      status: { $in: ["upcoming", "ongoing"] },
      isArchived: { $ne: true },
    }),
    ApprovalRequest.countDocuments({ status: "pending" }),
    EventLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    Match.find({
      status: "scheduled",
      scheduledDate: { $gte: new Date() },
    })
      .sort({ scheduledDate: 1, startTime: 1 })
      .limit(5)
      .populate({
        path: "eventId",
        select: "title game isArchived",
        match: { isArchived: { $ne: true } },
      })
      .lean()
      .then((matches) => matches.filter((match) => match.eventId)),
    Event.find({ isArchived: { $ne: true } })
      .select("title game maxSlots status")
      .lean(),
    Registration.aggregate([
      {
        $match: {
          status: {
            $in: ["pending", "accepted", "rejected", "cancelled"],
          },
        },
      },
      {
        $group: {
          _id: "$eventId",
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          accepted: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const statsByEvent = new Map(
    registrationStats.map((item) => [String(item._id), item]),
  );

  const eventSummaries = events.map((event) => {
    const stats = statsByEvent.get(String(event._id));
    const accepted = stats?.accepted ?? 0;

    return {
      eventId: event._id,
      title: event.title,
      game: event.game,
      status: event.status,
      registration: {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        accepted,
        rejected: stats?.rejected ?? 0,
        cancelled: stats?.cancelled ?? 0,
      },
      slots:
        event.maxSlots == null
          ? {
              capacity: null,
              occupied: accepted,
              remaining: null,
              unlimited: true,
            }
          : {
              capacity: event.maxSlots,
              occupied: accepted,
              remaining: Math.max(0, event.maxSlots - accepted),
              unlimited: false,
            },
    };
  });

  res.json({
    stats: {
      totalEvents,
      totalRegistrations,
      activeEvents,
      pendingApprovals,
    },
    eventSummaries,
    upcomingMatches,
    recentActivity,
  });
});

// Public listing: approved events only; archived and expired events excluded.
export const getEvents = asyncHandler(async (req, res) => {
  const filter = publicEventFilter();

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const events = await Event.find(filter).sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

// Public detail: do not reveal draft, pending, rejected, archived, or expired events.
export const getEventById = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findOne({
    _id: req.params.id,
    ...publicEventFilter(),
  }).lean();

  if (!event) {
    throw new AppError(404, "NOT_FOUND", "Event not found.");
  }

  res.json({ success: true, data: event });
});

export const createEvent = asyncHandler(async (req, res) => {
  const fields = pickEventFields(req.body);

  if (
    typeof fields.title !== "string" ||
    !fields.title.trim() ||
    typeof fields.game !== "string" ||
    !fields.game.trim()
  ) {
    throw new AppError(400, "INVALID", "Title and game are required.");
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const [event] = await Event.create(
        [
          {
            ...fields,
            title: fields.title.trim(),
            game: fields.game.trim(),
            status: "draft",
            approvalStatus: "pending",
            createdBy: actorId(req.user),
          },
        ],
        { session },
      );

      const [approvalRequest] = await ApprovalRequest.create(
        [
          {
            type: "event",
            targetId: event._id,
            requestedBy: actorId(req.user),
            status: "pending",
          },
        ],
        { session },
      );

      await logAudit({
        actor: req.user,
        action: "EVENT_CREATED",
        targetType: "Event",
        targetId: event._id,
        description: `Created event "${event.title}" and submitted it for approval.`,
        session,
      });

      await logEvent({
        eventId: event._id,
        actor: req.user,
        action: "EVENT_CREATED",
        description: "Event created and submitted for approval.",
        changes: {
          status: "draft",
          approvalStatus: "pending",
        },
        session,
      });

      result = { event, approvalRequest };
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({
    success: true,
    message: "Event created and submitted for approval.",
    data: result,
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const fields = pickEventFields(req.body);

  if (!Object.keys(fields).length) {
    throw new AppError(400, "NO_FIELDS", "Provide fields to update.");
  }

  if (
    ("title" in fields &&
      (typeof fields.title !== "string" || !fields.title.trim())) ||
    ("game" in fields &&
      (typeof fields.game !== "string" || !fields.game.trim()))
  ) {
    throw new AppError(400, "INVALID", "Title and game cannot be empty.");
  }

  if (
    ("playersPerTeam" in fields &&
      (!Number.isInteger(Number(fields.playersPerTeam)) ||
        Number(fields.playersPerTeam) < 1)) ||
    ("maxSlots" in fields &&
      fields.maxSlots != null &&
      (!Number.isInteger(Number(fields.maxSlots)) ||
        Number(fields.maxSlots) < 1))
  ) {
    throw new AppError(
      400,
      "INVALID_CAPACITY",
      "Team size and slot capacity must be positive whole numbers.",
    );
  }

  for (const field of [
    "eventStartDate",
    "eventEndDate",
    "registrationOpenDate",
    "registrationClosedDate",
  ]) {
    if (field in fields && fields[field] != null) {
      const date = new Date(fields[field]);

      if (Number.isNaN(date.getTime())) {
        throw new AppError(
          400,
          "INVALID_DATE",
          `${field} is not a valid date.`,
        );
      }

      fields[field] = date;
    }
  }

  if ("title" in fields) fields.title = fields.title.trim();
  if ("game" in fields) fields.game = fields.game.trim();

  const session = await mongoose.startSession();
  let updatedEvent;

  try {
    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);

      if (!event || event.isArchived || event.archiveStatus !== "active") {
        throw new AppError(404, "NOT_FOUND", "Event not found.");
      }

      if (event.status === "completed" || event.status === "cancelled") {
        throw new AppError(
          409,
          "INVALID_STATE",
          "Completed or cancelled events cannot be edited.",
        );
      }

      const before = Object.fromEntries(
        Object.keys(fields).map((field) => [field, event.get(field)]),
      );

      Object.assign(event, fields);
      await event.save({ session });

      await logAudit({
        actor: req.user,
        action: "EVENT_UPDATED",
        targetType: "Event",
        targetId: event._id,
        description: `Updated event "${event.title}".`,
        session,
      });

      await logEvent({
        eventId: event._id,
        actor: req.user,
        action: "EVENT_UPDATED",
        description: "Event details updated.",
        changes: { before, after: fields },
        session,
      });

      updatedEvent = event;
    });
  } finally {
    await session.endSession();
  }

  res.json({ success: true, data: updatedEvent });
});

export const completeEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const session = await mongoose.startSession();
  let completedEvent;

  try {
    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);

      if (!event || event.isArchived || event.archiveStatus !== "active") {
        throw new AppError(404, "NOT_FOUND", "Event not found.");
      }

      if (event.approvalStatus !== "approved") {
        throw new AppError(
          400,
          "INVALID_STATE",
          "Only approved events can be completed.",
        );
      }

      if (event.status === "completed") {
        throw new AppError(409, "INVALID_STATE", "Event is already completed.");
      }

      if (event.status === "cancelled") {
        throw new AppError(
          409,
          "INVALID_STATE",
          "Cancelled events cannot be completed.",
        );
      }

      const previousStatus = event.status;
      event.status = "completed";
      await event.save({ session });

      await logAudit({
        actor: req.user,
        action: "EVENT_COMPLETED",
        targetType: "Event",
        targetId: event._id,
        description: `Marked event "${event.title}" as completed.`,
        session,
      });

      await logEvent({
        eventId: event._id,
        actor: req.user,
        action: "EVENT_COMPLETED",
        description: "Event marked as completed.",
        changes: {
          status: { before: previousStatus, after: "completed" },
        },
        session,
      });

      completedEvent = event;
    });
  } finally {
    await session.endSession();
  }

  res.json({
    success: true,
    message: "Event completed.",
    data: completedEvent,
  });
});
