import mongoose from "mongoose";
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import ApprovalRequest from "../models/ApprovalRequests.js";
import Match from "../models/Matches.js";
import EventLog from "../models/EventLog.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

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

export const getEvents = asyncHandler(async (req, res) => {
  const filter = { isArchived: { $ne: true } };

  if (req.query.status) filter.status = req.query.status;
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

export const getEventById = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
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
    message: "Created.",
    data: { event, approvalRequest },
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const fields = pickEventFields(req.body);

  if (!Object.keys(fields).length) {
    throw new AppError(400, "NO_FIELDS", "Provide fields to update.");
  }

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
    throw new AppError(404, "NOT_FOUND", "Event not found.");
  }

  if (event.status === "completed") {
    throw new AppError(
      409,
      "INVALID_STATE",
      "Completed events cannot be edited.",
    );
  }

  Object.assign(event, fields);

  res.json({
    success: true,
    data: await event.save(),
  });
});

export const completeEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event || event.isArchived) {
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

  event.status = "completed";

  res.json({
    success: true,
    message: "Completed.",
    data: await event.save(),
  });
});
