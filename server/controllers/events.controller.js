import mongoose from "mongoose";
import Event, { STATUSES } from "../models/Events.js";
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
  "registrationCloseDate",
  "registrationMode",
  "playersPerTeam",
  "maxSubstitutes",
  "maxSlots",
];

const DATE_FIELDS = [
  "eventStartDate",
  "eventEndDate",
  "registrationOpenDate",
  "registrationCloseDate",
];

const ACTIVE_EVENT_FILTER = {
  isArchived: { $ne: true },
  archiveStatus: { $nin: ["archived", "expired"] },
};

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

function validateEventDates(fields, existingEvent = null) {
  const dates = {};

  for (const field of DATE_FIELDS) {
    const supplied = Object.hasOwn(fields, field);
    const value = supplied ? fields[field] : existingEvent?.[field];

    if (value == null || value === "") {
      if (!existingEvent || supplied) {
        throw new AppError(400, "REQUIRED_DATE", `${field} is required.`);
      }
      continue;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new AppError(400, "INVALID_DATE", `${field} must be a valid date.`);
    }

    dates[field] = date;
  }

  const eventStartDate = dates.eventStartDate ?? existingEvent?.eventStartDate;
  const eventEndDate = dates.eventEndDate ?? existingEvent?.eventEndDate;
  const registrationOpenDate =
    dates.registrationOpenDate ?? existingEvent?.registrationOpenDate;
  const registrationCloseDate =
    dates.registrationCloseDate ?? existingEvent?.registrationCloseDate;

  if (
    eventStartDate &&
    eventEndDate &&
    new Date(eventEndDate) < new Date(eventStartDate)
  ) {
    throw new AppError(
      400,
      "INVALID_DATE_RANGE",
      "Event end date must be on or after the start date.",
    );
  }

  if (
    registrationOpenDate &&
    registrationCloseDate &&
    new Date(registrationCloseDate) < new Date(registrationOpenDate)
  ) {
    throw new AppError(
      400,
      "INVALID_REGISTRATION_RANGE",
      "Registration close date must be on or after the open date.",
    );
  }

  return dates;
}

function validateCapacityFields(fields) {
  const rules = [
    [
      "playersPerTeam",
      1,
      "INVALID_TEAM_SIZE",
      "Players per team must be a positive whole number.",
    ],
    [
      "maxSubstitutes",
      0,
      "INVALID_SUBSTITUTES",
      "Maximum substitutes must be a non-negative whole number.",
    ],
    [
      "maxSlots",
      1,
      "INVALID_CAPACITY",
      "Maximum slots must be a positive whole number.",
    ],
  ];

  for (const [field, minimum, code, message] of rules) {
    if (!Object.hasOwn(fields, field) || fields[field] == null) continue;

    const value = Number(fields[field]);

    if (!Number.isInteger(value) || value < minimum) {
      throw new AppError(400, code, message);
    }

    fields[field] = value;
  }
}

function normalizeTextFields(fields) {
  for (const field of ["title", "game"]) {
    if (!Object.hasOwn(fields, field)) continue;

    if (typeof fields[field] !== "string" || !fields[field].trim()) {
      throw new AppError(
        400,
        "INVALID_FIELD",
        `${field} must be a non-empty string.`,
      );
    }

    fields[field] = fields[field].trim();
  }

  for (const field of ["season", "description", "venue"]) {
    if (!Object.hasOwn(fields, field)) continue;

    if (fields[field] != null && typeof fields[field] !== "string") {
      throw new AppError(400, "INVALID_FIELD", `${field} must be a string.`);
    }

    if (typeof fields[field] === "string") {
      fields[field] = fields[field].trim();
    }
  }

  if (
    Object.hasOwn(fields, "type") &&
    fields.type != null &&
    !["tournament", "tryout", "campus_event"].includes(fields.type)
  ) {
    throw new AppError(400, "INVALID_TYPE", "Invalid event type.");
  }

  if (
    Object.hasOwn(fields, "registrationMode") &&
    fields.registrationMode != null &&
    !["team", "individual"].includes(fields.registrationMode)
  ) {
    throw new AppError(
      400,
      "INVALID_REGISTRATION_MODE",
      "Registration mode must be team or individual.",
    );
  }
}

function assertAuthenticatedActor(user) {
  const id = user?._id ?? user?.id;

  if (!id || !mongoose.isValidObjectId(id)) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "A valid authenticated user is required.",
    );
  }

  return id;
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
    Event.countDocuments(ACTIVE_EVENT_FILTER),
    Registration.countDocuments(),
    Event.countDocuments({
      ...ACTIVE_EVENT_FILTER,
      status: { $in: ["published", "ongoing"] },
      approvalStatus: "approved",
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
        select: "title game isArchived archiveStatus approvalStatus",
        match: {
          ...ACTIVE_EVENT_FILTER,
          approvalStatus: "approved",
        },
      })
      .lean()
      .then((matches) => matches.filter((match) => match.eventId)),
    Event.find(ACTIVE_EVENT_FILTER)
      .select("title game maxSlots status approvalStatus")
      .lean(),
    Registration.aggregate([
      {
        $match: {
          status: { $in: ["pending", "accepted", "rejected", "cancelled"] },
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
      approvalStatus: event.approvalStatus,
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

  res.status(200).json({
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

export const getEvents = asyncHandler(async (req, res) => {
  const filter = publicEventFilter();

  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) {
      throw new AppError(400, "INVALID_STATUS", "Invalid event status filter.");
    }

    filter.status = req.query.status;
  }

  const events = await Event.find(filter)
    .sort({ eventStartDate: 1, createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

export const getEventById = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findOne({
    _id: req.params.id,
    ...publicEventFilter(),
  }).lean();

  if (!event) {
    throw new AppError(404, "NOT_FOUND", "Event not found.");
  }

  res.status(200).json({ success: true, data: event });
});

export const createEvent = asyncHandler(async (req, res) => {
  const fields = pickEventFields(req.body);
  const createdBy = assertAuthenticatedActor(req.user);

  normalizeTextFields(fields);
  validateCapacityFields(fields);
  Object.assign(fields, validateEventDates(fields));

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const [event] = await Event.create(
        [
          {
            ...fields,
            status: "draft",
            approvalStatus: "pending",
            isArchived: false,
            archiveStatus: "active",
            createdBy,
          },
        ],
        { session },
      );

      const [approvalRequest] = await ApprovalRequest.create(
        [
          {
            type: "event",
            targetId: event._id,
            requestedBy: createdBy,
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

      result = {
        event: event.toObject(),
        approvalRequest: approvalRequest.toObject(),
      };
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

  normalizeTextFields(fields);
  validateCapacityFields(fields);

  const session = await mongoose.startSession();
  let updatedEvent;

  try {
    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);

      if (
        !event ||
        event.isArchived ||
        ["archived", "expired"].includes(event.archiveStatus)
      ) {
        throw new AppError(404, "NOT_FOUND", "Event not found.");
      }

      if (event.status === "completed") {
        throw new AppError(
          409,
          "INVALID_STATE",
          "Completed events cannot be edited.",
        );
      }

      if (event.approvalStatus !== "pending") {
        throw new AppError(
          409,
          "INVALID_STATE",
          "Only events awaiting approval can be edited.",
        );
      }

      Object.assign(fields, validateEventDates(fields, event));

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

      updatedEvent = event.toObject();
    });
  } finally {
    await session.endSession();
  }

  res.status(200).json({
    success: true,
    message: "Event updated successfully.",
    data: updatedEvent,
  });
});

export const completeEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);
  assertAuthenticatedActor(req.user);

  const session = await mongoose.startSession();
  let completedEvent;

  try {
    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);

      if (
        !event ||
        event.isArchived ||
        ["archived", "expired"].includes(event.archiveStatus)
      ) {
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

      completedEvent = event.toObject();
    });
  } finally {
    await session.endSession();
  }

  res.status(200).json({
    success: true,
    message: "Event completed.",
    data: completedEvent,
  });
});
