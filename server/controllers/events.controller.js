
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import ApprovalRequest from "../models/ApprovalRequests.js";
import Match from "../models/Matches.js";
import EventLog from "../models/EventLog.js";

export async function getDashboardStats(req, res) {
  try {
        const [
        totalEvents,
        totalRegistrations,
        activeEvents,
        pendingApprovals,
        recentActivity,
        upcomingMatches,
        events,
        registrationsByEvent,
        ] = await Promise.all([
      Event.countDocuments({
        isArchived: { $ne: true },
      }),

      Registration.countDocuments(),

      Event.countDocuments({
        status: { $in: ["upcoming", "ongoing"] },
        isArchived: { $ne: true },
      }),

        ApprovalRequest.countDocuments({
        status: "pending",
        }),

        EventLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

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
        .then((matches) =>
            matches.filter((match) => match.eventId !== null)
        ),


      Event.find({
        isArchived: { $ne: true },
      })
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


const registrationMap = new Map(
  (Array.isArray(registrationsByEvent) ? registrationsByEvent : []).map(
    (item) => [String(item._id), item]
  )
);


    const eventSummaries = (events ?? []).map((event) => {
      const registration = registrationMap.get(String(event._id));

      const total = registration?.total ?? 0;
      const accepted = registration?.accepted ?? 0;

      return {
        eventId: event._id,
        title: event.title,
        game: event.game,
        status: event.status,

        registration: {
          total,
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
                remaining: Math.max(
                  0,
                  event.maxSlots - accepted,
                ),
                unlimited: false,
              },
      };
    });

    return res.json({
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
  } catch (error) {
    console.error("getDashboardStats error:", error);

    return res.status(500).json({
      message: "Failed to load dashboard data.",
    });
}
}
import mongoose from "mongoose";
import Event from "../models/Events.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

import ApprovalRequest from "../models/ApprovalRequests.js";

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

function pickEventFields(body) {
  return Object.fromEntries(
    EVENT_FIELDS.filter((field) => Object.hasOwn(body, field)).map((field) => [
      field,
      body[field],
    ]),
  );
}

function validateEventId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "INVALID_EVENT_ID", "Invalid event ID.");
  }
}

export const getEvents = asyncHandler(async (req, res) => {
  const filter = { isArchived: false };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.approvalStatus) {
    filter.approvalStatus = req.query.approvalStatus;
  }

  const events = await Event.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

// GET /api/events/archive — Admin and Head only
export const getArchivedEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ isArchived: true }).sort({
    archivedAt: -1,
  });

  for (const event of events) {
    await expireArchiveIfNeeded(event);
  }

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

// GET /api/events/:id
export const getEventById = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  res.status(200).json({
    success: true,
    data: event,
  });
});

export const createEvent = asyncHandler(async (req, res) => {
  const fields = pickEventFields(req.body);

  if (
    typeof fields.title !== "string" ||
    !fields.title.trim() ||
    typeof fields.game !== "string" ||
    !fields.game.trim()
  ) {
    throw new AppError(
      400,
      "INVALID_EVENT",
      "Event title and game are required.",
    );
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
    data: {
      event,
      approvalRequest,
    },
  });
});

// PATCH /api/events/:id
export const updateEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const fields = pickEventFields(req.body);

  if (Object.keys(fields).length === 0) {
    throw new AppError(
      400,
      "NO_EVENT_FIELDS",
      "Provide at least one event field to update.",
    );
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  if (event.isArchived) {
    throw new AppError(
      400,
      "EVENT_ARCHIVED",
      "Archived events cannot be edited.",
    );
  }

  Object.assign(event, fields);
  await event.save();

  res.status(200).json({
    success: true,
    data: event,
  });
});

const ARCHIVE_RETENTION_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function expireArchiveIfNeeded(event) {
  if (
    !event.isArchived ||
    !event.archivedAt ||
    event.archiveStatus === "expired"
  ) {
    return event;
  }

  const expiresAt = new Date(
    event.archivedAt.getTime() + ARCHIVE_RETENTION_DAYS * DAY_IN_MS,
  );

  if (Date.now() >= expiresAt.getTime()) {
    event.archiveStatus = "expired";
    await event.save();
  }

  return event;
}

export const completeEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  if (event.isArchived) {
    throw new AppError(
      409,
      "EVENT_ARCHIVED",
      "An archived event cannot be completed.",
    );
  }

  if (event.approvalStatus !== "approved") {
    throw new AppError(
      400,
      "EVENT_NOT_APPROVED",
      "Only approved events can be completed.",
    );
  }

  if (event.status === "completed") {
    throw new AppError(
      409,
      "EVENT_ALREADY_COMPLETED",
      "Event is already completed.",
    );
  }

  event.status = "completed";
  await event.save();

  res.status(200).json({
    success: true,
    message: "Event marked as completed.",
    data: event,
  });
});

// PATCH /api/events/:id/archive
export const archiveEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  if (event.isArchived) {
    throw new AppError(
      409,
      "EVENT_ALREADY_ARCHIVED",
      "Event is already archived.",
    );
  }

  if (event.approvalStatus !== "pending") {
    throw new AppError(
      400,
      "EVENT_NOT_PENDING",
      "Only events pending approval can be archived.",
    );
  }

  if (event.status === "completed") {
    throw new AppError(
      400,
      "EVENT_COMPLETED",
      "Completed events cannot be archived.",
    );
  }

  event.isArchived = true;
  event.archiveStatus = "archived";
  event.archivedAt = new Date();
  event.archivedBy = req.user._id;
  event.archiveReason =
    typeof req.body.reason === "string" ? req.body.reason.trim() : "";

  // Clear previous restoration metadata if this event was restored before.
  event.restoredAt = undefined;
  event.restoredBy = undefined;

  await event.save();

  res.status(200).json({
    success: true,
    message: "Event archived. It can be restored within 7 days.",
    data: event,
  });
});

// PATCH /api/events/:id/restore
export const restoreEvent = asyncHandler(async (req, res) => {
  validateEventId(req.params.id);

  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
  }

  if (!event.isArchived || !event.archivedAt) {
    throw new AppError(
      400,
      "EVENT_NOT_ARCHIVED",
      "This event is not archived.",
    );
  }

  await expireArchiveIfNeeded(event);

  if (event.archiveStatus === "expired") {
    throw new AppError(
      410,
      "ARCHIVE_EXPIRED",
      "The 7-day restoration period has expired.",
    );
  }

  event.isArchived = false;
  event.archiveStatus = "active";
  event.archivedAt = undefined;
  event.archivedBy = undefined;
  event.archiveReason = undefined;
  event.restoredAt = new Date();
  event.restoredBy = req.user._id;

  await event.save();

  res.status(200).json({
    success: true,
    message: "Event restored successfully.",
    data: event,
  });
});
