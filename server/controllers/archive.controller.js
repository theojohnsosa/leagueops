import mongoose from "mongoose";
import Event from "../models/Events.js";
import EventLog from "../models/EventLog.js";
import AuditLog from "../models/AuditLogs.js";

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getUser(req) {
  return req.user ?? null;
}

function hasRole(user, roles) {
  return Boolean(user && roles.includes(user.role));
}

function getUserId(user) {
  return user?._id ?? user?.id ?? null;
}

function getActorName(user) {
  const name = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user?.name || user?.fullName || user?.studentEmail;
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

async function writeLogs(event, user, action, description) {
  const actorId = getUserId(user);
  const actorName = getActorName(user);

  await Promise.all([
    EventLog.create({
      eventId: event._id,
      actorId,
      actorName,
      actorRole: user?.role,
      action,
      description,
    }),
    AuditLog.create({
      actorId,
      actorName,
      actorRole: user?.role,
      action,
      targetType: "Event",
      targetId: event._id,
      description,
    }),
  ]);
}

function getRestoreDeadline(archivedAt) {
  return new Date(new Date(archivedAt).getTime() + RESTORE_WINDOW_MS);
}

export async function archiveEvent(req, res, next) {
  try {
    const user = getUser(req);

    if (!user) {
      return res.status(401).json({ message: "Login required." });
    }

    if (!hasRole(user, ["admin", "head"])) {
      return res.status(403).json({
        message: "Only Admin or Head can archive events.",
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Archive reason is required.",
      });
    }

    const userId = getUserId(user);

    if (!userId || !validId(userId)) {
      return res.status(401).json({
        message: "Authenticated user ID is missing or invalid.",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.isArchived) {
      return res.status(409).json({
        message: "Event is already archived.",
      });
    }

    if (event.approvalStatus !== "pending") {
      return res.status(400).json({
        message: "Only events awaiting approval can be archived.",
      });
    }

    if (event.status === "completed") {
      return res.status(400).json({
        message: "Completed events cannot be archived.",
      });
    }

    event.isArchived = true;
    event.archiveStatus = "archived";
    event.archivedAt = new Date();
    event.archivedBy = userId;
    event.archiveReason = reason.trim();
    event.restoredAt = undefined;
    event.restoredBy = undefined;

    await event.save();

    await writeLogs(
      event,
      user,
      "EVENT_ARCHIVED",
      `Event archived. Reason: ${reason.trim()}`,
    );

    return res.json({
      message: "Event archived successfully.",
      event,
      restoreDeadline: getRestoreDeadline(event.archivedAt),
    });
  } catch (error) {
    return next(error);
  }
}

export async function getArchivedEvents(req, res, next) {
  try {
    const user = getUser(req);

    if (!user) {
      return res.status(401).json({ message: "Login required." });
    }

    if (!hasRole(user, ["admin", "head", "committee"])) {
      return res.status(403).json({
        message: "You cannot view archived events.",
      });
    }

    const events = await Event.find({ isArchived: true }).sort({
      archivedAt: -1,
    });

    const now = Date.now();

    const archivedEvents = events.map((event) => {
      const deadline = event.archivedAt
        ? getRestoreDeadline(event.archivedAt)
        : null;

      const canRestore =
        event.archiveStatus === "archived" &&
        deadline !== null &&
        Number.isFinite(deadline.getTime()) &&
        now < deadline.getTime();

      return {
        ...event.toObject(),
        restoreDeadline: deadline,
        canRestore,
      };
    });

    return res.json(archivedEvents);
  } catch (error) {
    return next(error);
  }
}

export async function restoreEvent(req, res, next) {
  try {
    const user = getUser(req);

    if (!user) {
      return res.status(401).json({ message: "Login required." });
    }

    if (!hasRole(user, ["admin"])) {
      return res.status(403).json({
        message: "Only Admin can restore archived events.",
      });
    }

    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }

    const userId = getUserId(user);

    if (!userId || !validId(userId)) {
      return res.status(401).json({
        message: "Authenticated user ID is missing or invalid.",
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!event.isArchived || !event.archivedAt) {
      return res.status(400).json({
        message: "Event is not archived or has no archive timestamp.",
      });
    }

    const deadline = getRestoreDeadline(event.archivedAt);

    if (!Number.isFinite(deadline.getTime())) {
      return res.status(400).json({
        message: "Event has an invalid archive timestamp.",
      });
    }

    if (event.archiveStatus === "expired" || Date.now() >= deadline.getTime()) {
      if (event.archiveStatus !== "expired") {
        event.archiveStatus = "expired";
        await event.save();

        await writeLogs(
          event,
          user,
          "EVENT_ARCHIVE_EXPIRED",
          "The 7-day archive restore window expired.",
        );
      }

      return res.status(410).json({
        message: "The 7-day restore window has expired.",
        restoreDeadline: deadline,
      });
    }

    event.isArchived = false;
    event.archiveStatus = "active";
    event.restoredAt = new Date();
    event.restoredBy = userId;

    await event.save();

    await writeLogs(
      event,
      user,
      "EVENT_RESTORED",
      "Event restored from archive.",
    );

    return res.json({
      message: "Event restored successfully.",
      event,
    });
  } catch (error) {
    return next(error);
  }
}
