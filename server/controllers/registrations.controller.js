import mongoose from "mongoose";
import Event from "../models/Events.js";
import Registration, { STATUSES } from "../models/Registrations.js";
import {
  validateRegistration,
  checkSlotCap,
  checkPlayerConflicts,
} from "../utils/rulesEngine.js";

const ACTIVE_STATUSES = ["pending", "accepted"];

const REVIEW_STATUSES = ["pending", "accepted", "rejected"];

const OPEN_EVENT_STATUSES = ["upcoming", "ongoing"];

// ---------- helpers ----------

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function statusFromErrors(errors) {
  const codes = errors.map((e) => e.code);
  const conflict = [
    "SLOTS_FULL",
    "DUPLICATE_TEAM_NAME",
    "DUPLICATE_ROSTER",
    "PLAYER_ALREADY_REGISTERED",
  ];
  if (codes.includes("REGISTRATION_CLOSED")) return 403;
  if (codes.some((c) => conflict.includes(c))) return 409;
  return 400;
}

function currentUserId(req) {
  return req.user?._id ?? req.user?.id ?? null;
}
function isAdmin(req) {
  return req.user?.role === "admin";
}

function cleanPlayers(playerDetails) {
  if (!Array.isArray(playerDetails)) return [];
  return playerDetails.map((p) => ({
    userId: p?.userId,
    studentId: String(p?.studentId ?? "").trim(),
    firstName: p?.firstName,
    lastName: p?.lastName,
    inGameName: p?.inGameName,
  }));
}

function eventBlockReason(event) {
  if (event.isArchived) return "This event is archived.";
  if (event.approvalStatus !== "approved") {
    return "This event has not been approved yet.";
  }
  if (!OPEN_EVENT_STATUSES.includes(event.status)) {
    return `This event is not open for registration (status: ${event.status}).`;
  }
  if (!event.playersPerTeam) {
    return "This event has no team size configured.";
  }
  return null;
}

export async function createRegistration(req, res) {
  try {
    const { eventId } = req.params;
    const userId = currentUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Login required." });
    }
    if (!isValidId(eventId)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }

    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const blocked = eventBlockReason(event);
    if (blocked) {
      return res.status(403).json({ message: blocked });
    }

    const { teamName, division, rankDetails } = req.body;
    const playerDetails = cleanPlayers(req.body.playerDetails);

    const existing = await Registration.find({
      eventId,
      status: { $in: ACTIVE_STATUSES },
    }).lean();

    const result = validateRegistration(
      event,
      { teamName, playerDetails },
      existing,
      new Date(),
    );

    if (!result.ok) {
      return res.status(statusFromErrors(result.errors)).json({
        message: "Registration failed validation.",
        errors: result.errors,
      });
    }

    const registration = await Registration.create({
      eventId,
      submittedBy: userId,
      teamName: String(teamName).trim().replace(/\s+/g, " "),
      division,
      rankDetails,
      playerDetails,
      status: "pending",
    });

    return res.status(201).json(registration);
  } catch (err) {
    console.error("createRegistration error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getRegistrationsByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        message: "Invalid event ID.",
      });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${STATUSES.join(", ")}.`,
      });
    }

    const event = await Event.findById(eventId).select("isArchived").lean();

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    if (event.isArchived) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    const filter = { eventId };

    if (status) {
      filter.status = status;
    }

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json(registrations);
  } catch (err) {
    console.error("getRegistrationsByEvent error:", err);
    return res.status(500).json({ message: "Server error." }); // FIXED: was missing
  } // FIXED: was missing
}

// ---------- GET /api/registrations ----------
// Admin list of ALL registrations, with each event's title, game and mode filled in.
export async function listRegistrations(req, res) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Admin access required." });
    }

    const registrations = await Registration.find()
      .populate("eventId", "title game registrationMode")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return res.json(registrations);
  } catch (err) {
    console.error("listRegistrations error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getRegistrationById(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid registration ID.",
      });
    }

    const registration = await Registration.findById(id).lean();

    if (!registration) {
      return res.status(404).json({
        message: "Registration not found.",
      });
    }

    const userId = currentUserId(req);

    const isOwner =
      userId && String(registration.submittedBy) === String(userId);

    if (!isOwner && !isAdmin(req)) {
      return res.status(403).json({
        message: "Not allowed.",
      });
    }

    const event = await Event.findById(registration.eventId)
      .select("title game eventStartDate status isArchived")
      .lean();

    if (event?.isArchived) {
      return res.json({
        ...registration,
        eventId: null,
        eventArchived: true,
      });
    }

    return res.json({
      ...registration,
      eventId: event ?? registration.eventId,
      eventArchived: false,
    });
  } catch (err) {
    console.error("getRegistrationById error:", err);

    return res.status(500).json({
      message: "Server error.",
    });
  }
}

// Kept the newer version from main (hides archived events).
// The older duplicate of this function was deleted.
export async function getMyRegistrations(req, res) {
  try {
    const userId = currentUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Login required.",
      });
    }

    const registrations = await Registration.find({
      submittedBy: userId,
    })
      .populate({
        path: "eventId",
        select: "title game eventStartDate status isArchived",
      })
      .sort({ createdAt: -1 })
      .lean();

    const visibleRegistrations = registrations.map((registration) => {
      if (registration.eventId?.isArchived) {
        return {
          ...registration,
          eventId: null,
          eventArchived: true,
        };
      }

      return {
        ...registration,
        eventArchived: false,
      };
    });

    return res.json(visibleRegistrations);
  } catch (err) {
    console.error("getMyRegistrations error:", err);

    return res.status(500).json({
      message: "Server error.",
    });
  }
}

export async function updateRegistrationStatus(req, res) {
  try {
    // Only admins can accept, reject or reopen a registration.
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Admin access required." });
    }

    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid registration ID." });
    }
    if (!REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${REVIEW_STATUSES.join(", ")}.`,
      });
    }

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }
    if (registration.status === "cancelled") {
      return res
        .status(409)
        .json({ message: "A cancelled registration cannot be reviewed." });
    }
    if (registration.status === status) {
      return res.json(registration); // nothing to change
    }

    if (status === "accepted") {
      const event = await Event.findById(registration.eventId).lean();

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if (event.isArchived) {
        return res.status(403).json({
          message: "Cannot review registrations for an archived event.",
        });
      }

      const acceptedOthers = await Registration.find({
        eventId: registration.eventId,
        status: "accepted",
        _id: { $ne: registration._id },
      }).lean();

      const errors = [
        ...checkSlotCap(event, acceptedOthers),
        ...checkPlayerConflicts(registration.toObject(), acceptedOthers),
      ];

      if (errors.length > 0) {
        return res.status(statusFromErrors(errors)).json({
          message: "Cannot accept this registration.",
          errors,
        });
      }
    }

    registration.status = status;
    registration.rejectionReason =
      status === "rejected" ? rejectionReason : undefined;
    await registration.save();

    return res.json(registration);
  } catch (err) {
    console.error("updateRegistrationStatus error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function cancelRegistration(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid registration ID.",
      });
    }

    const registration = await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({
        message: "Registration not found.",
      });
    }

    const userId = currentUserId(req);

    const isOwner =
      userId && String(registration.submittedBy) === String(userId);

    if (!isOwner && !isAdmin(req)) {
      return res.status(403).json({
        message: "Not allowed.",
      });
    }

    if (registration.status === "cancelled") {
      return res.json(registration);
    }

    registration.status = "cancelled";
    registration.cancelledAt = new Date();

    await registration.save();

    return res.json({
      message: "Registration cancelled successfully.",
      registration,
    });
  } catch (err) {
    console.error("cancelRegistration error:", err);

    return res.status(500).json({
      message: "Server error.",
    });
  }
}
