import mongoose from "mongoose";
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import ApprovalRequest from "../models/ApprovalRequests.js";
import Match from "../models/Matches.js";
import EventLog from "../models/EventLog.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

const ARCHIVE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

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

const pickEventFields = (body = {}) =>
  Object.fromEntries(
    EVENT_FIELDS.filter((field) => Object.hasOwn(body, field)).map((field) => [
      field,
      body[field],
    ]),
  );

const validateEventId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "INVALID_EVENT_ID", "Invalid event ID.");
  }
};

const expireArchiveIfNeeded = async (event) => {
  if (
    event.isArchived &&
    event.archivedAt &&
    event.archiveStatus !== "expired" &&
    Date.now() >= event.archivedAt.getTime() + ARCHIVE_RETENTION_MS
  ) {
    event.archiveStatus = "expired";
    await event.save();
  }

  return event;
};

// GET /api/dashboard/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalEvents,
    totalRegistrations,
    activeEvents,
    pendingApprovals,
    recentActivity,
    upcomingMatches,
    events,
    registrationGroups,
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
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          accepted: {
            $sum: {
              $cond: [{ $eq: ["$status", "accepted"] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const registrationsByEvent = new Map(
    registrationGroups.map((group) => [String(group._id), group]),
  );

  const eventSummaries = events.map((event) => {
    const registration = registrationsByEvent.get(String(event._id));
    const accepted = registration?.accepted ?? 0;

    return {
      eventId: event._id,
      title: event.title,
      game: event.game,
      status: event.status,
      registration: {
        total: registration?.total ?? 0,
        pending: registration?.pending ?? 0,
        accepted,
        rejected: registration?.rejected ?? 0,
        cancelled: registration?.cancelled ?? 0,
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
    success: true,
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

// GET /api/events
export const getEvents = asyncHandler(async (req, res) => {
  const filter = { isArchived: { $ne: true } };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.approvalStatus) {
    filter.approvalStatus = req.query.approvalStatus;
  }

  const events = await Event.find(filter).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

// GET /api/events/archive
export const getArchivedEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ isArchived: true }).sort({
    archivedAt: -1,
  });

  for (const event of events) {
    await expireArchiveIfNeeded(event);
  }

  res.json({
    success: true,
    count: events.length,
    data: events,
  });
});

// GET /api/events/:id
export const getEventById = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  res.json({ success: true, data: event });
});

// POST /api/events
export const createEvent = asyncHandler(async (req, res) => {
  const fields = pickEventFields(req.body);

  if (
    typeof fields.title !== "string" ||
    !fields.title.trim() ||
    typeof fields.game !== "string" ||
    !fields.game.trim()
  ) {
    throw new AppError(400, "INVALID_EVENT", "A title and game are required.");
  }

  const session = await mongoose.startSession();

  let event;
  let approvalRequest;

  try {
    await session.withTransaction(async () => {
      [event] = await Event.create(
        [
          {
            ...fields,
            title: fields.title.trim(),
            game: fields.game.trim(),
            status: "draft",
            approvalStatus: "pending",
            createdBy: req.user._id,
          },
        ],
        { session },
      );

      [approvalRequest] = await ApprovalRequest.create(
        [
          {
            type: "event",
            targetId: event._id,
            requestedBy: req.user._id,
            status: "pending",
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({
    success: true,
    message: "Event created and submitted for approval.",
    data: { event, approvalRequest },
  });
});

// PATCH /api/events/:id
export const updateEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const fields = pickEventFields(req.body);

  if (!Object.keys(fields).length) {
    throw new AppError(
      400,
      "NO_EVENT_FIELDS",
      "Provide at least one valid event field.",
    );
  }

  if (
    ("title" in fields &&
      (typeof fields.title !== "string" || !fields.title.trim())) ||
    ("game" in fields &&
      (typeof fields.game !== "string" || !fields.game.trim()))
  ) {
    throw new AppError(400, "INVALID_EVENT", "Title and game cannot be empty.");
  }

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found or archived.");
  }

  if (event.status === "completed") {
    throw new AppError(
      400,
      "EVENT_COMPLETED",
      "Completed events cannot be edited.",
    );
  }

  if (fields.title) fields.title = fields.title.trim();
  if (fields.game) fields.game = fields.game.trim();

  Object.assign(event, fields);

  res.json({
    success: true,
    data: await event.save(),
  });
});

// PATCH /api/events/:id/complete
export const completeEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  if (event.approvalStatus !== "approved") {
    throw new AppError(
      400,
      "EVENT_NOT_APPROVED",
      "Only approved events can be completed.",
    );
  }

  if (event.status === "completed") {
    throw new AppError(400, "EVENT_COMPLETED", "Event is already completed.");
  }

  event.status = "completed";

  res.json({
    success: true,
    message: "Event marked as completed.",
    data: await event.save(),
  });
});

// PATCH /api/events/:id/archive
export const archiveEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  if (event.status === "completed") {
    throw new AppError(
      400,
      "EVENT_COMPLETED",
      "Completed events cannot be archived.",
    );
  }

  if (event.approvalStatus !== "pending") {
    throw new AppError(
      400,
      "EVENT_NOT_PENDING",
      "Only events pending approval can be archived.",
    );
  }

  event.isArchived = true;
  event.archiveStatus = "archived";
  event.archivedAt = new Date();
  event.archivedBy = req.user._id;
  event.archiveReason =
    typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  event.restoredAt = undefined;
  event.restoredBy = undefined;

  res.json({
    success: true,
    message: "Event archived.",
    data: await event.save(),
  });
});

// PATCH /api/events/:id/restore
export const restoreEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event || !event.isArchived) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Archived event not found.");
  }

  await expireArchiveIfNeeded(event);

  if (event.archiveStatus === "expired") {
    throw new AppError(
      410,
      "ARCHIVE_EXPIRED",
      "The seven-day restoration period has expired.",
    );
  }

  event.isArchived = false;
  event.archiveStatus = "active";
  event.archivedAt = undefined;
  event.archivedBy = undefined;
  event.archiveReason = undefined;
  event.restoredAt = new Date();
  event.restoredBy = req.user._id;

  res.json({
    success: true,
    message: "Event restored.",
    data: await event.save(),
  });
});
