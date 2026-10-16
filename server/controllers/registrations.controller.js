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
      return res.status(400).json({ message: "Invalid event ID." });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${STATUSES.join(", ")}.`,
      });
    }

    const filter = { eventId };
    if (status) filter.status = status;

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json(registrations);
  } catch (err) {
    console.error("getRegistrationsByEvent error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getMyRegistrations(req, res) {
  try {
    const userId = currentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Login required." });
    }

    const registrations = await Registration.find({ submittedBy: userId })
      .populate("eventId", "title game eventStartDate status")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(registrations);
  } catch (err) {
    console.error("getMyRegistrations error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function getRegistrationById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid registration ID." });
    }

    const registration = await Registration.findById(id).lean();
    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    const isOwner =
      String(registration.submittedBy) === String(currentUserId(req));
    if (!isOwner && !isAdmin(req)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    return res.json(registration);
  } catch (err) {
    console.error("getRegistrationById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function updateRegistrationStatus(req, res) {
  try {
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
      return res.status(400).json({ message: "Invalid registration ID." });
    }

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    const isOwner =
      String(registration.submittedBy) === String(currentUserId(req));
    if (!isOwner && !isAdmin(req)) {
      return res.status(403).json({ message: "Not allowed." });
    }
    if (registration.status === "cancelled") {
      return res.json(registration);
    }

    registration.status = "cancelled";
    registration.cancelledAt = new Date();
    await registration.save();

    return res.json(registration);
  } catch (err) {
    console.error("cancelRegistration error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}
