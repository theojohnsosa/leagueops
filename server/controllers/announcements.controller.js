import mongoose from "mongoose";
import Event from "../models/Events.js";
import Announcement, { STATUSES } from "../models/Announcements.js";
// Registers the User model so populate("createdBy") works.
import "../models/Users.js";

// Roles from Users.js that may manage announcements. Everyone can read published ones.
const STAFF_ROLES = ["admin", "head", "committee"];

// Read from the model, so this always matches the schema's enum.
const TYPES = Announcement.schema.path("type").enumValues;

// ---------- helpers ----------

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ASSUMPTION: your auth middleware sets req.user = { _id, role }.
function currentUserId(req) {
  return req.user?._id ?? req.user?.id ?? null;
}
function isStaff(req) {
  return STAFF_ROLES.includes(req.user?.role);
}

// Sends a 403 and returns false if the user is not staff.
function staffOnly(req, res) {
  if (!isStaff(req)) {
    res
      .status(403)
      .json({ message: "Only admin, head or committee can do this." });
    return false;
  }
  return true;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// If an eventId is given, it must be a real, non-archived event.
// Sends an error response and returns false if not.
async function eventLinkIsValid(eventId, res) {
  if (!isValidId(eventId)) {
    res.status(400).json({ message: "Invalid event ID." });
    return false;
  }
  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404).json({ message: "Event not found." });
    return false;
  }
  if (event.isArchived) {
    res.status(403).json({ message: "This event is archived." });
    return false;
  }
  return true;
}

// ---------- POST /api/announcements ----------
// body: { title, content, type?, eventId?, status? ("draft" | "published") }
export async function createAnnouncement(req, res) {
  try {
    if (!staffOnly(req, res)) return;

    const userId = currentUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Login required." });
    }

    const body = req.body ?? {};
    const title = cleanText(body.title);
    const content = cleanText(body.content);
    const type = cleanText(body.type).toLowerCase();
    const status = body.status === undefined ? "draft" : body.status;
    const { eventId } = body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "title and content are required." });
    }
    if (title.length > 150) {
      return res
        .status(400)
        .json({ message: "title can be at most 150 characters." });
    }
    if (content.length > 5000) {
      return res
        .status(400)
        .json({ message: "content can be at most 5000 characters." });
    }
    if (type && !TYPES.includes(type)) {
      return res
        .status(400)
        .json({ message: `type must be one of: ${TYPES.join(", ")}.` });
    }
    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({
        message: "A new announcement can only be a draft or published.",
      });
    }
    if (eventId && !(await eventLinkIsValid(eventId, res))) return;

    const announcement = await Announcement.create({
      title,
      content,
      type: type || undefined, // falls back to "general"
      status,
      eventId: eventId || null,
      publishedAt: status === "published" ? new Date() : null,
      createdBy: userId,
    });

    return res.status(201).json(announcement);
  } catch (err) {
    console.error("createAnnouncement error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- GET /api/announcements?status=&eventId=&type=&page=&limit= ----------
// Players: published only. Staff: everything except archived, unless
// ?status=draft|published|archived|all is given.
export async function getAnnouncements(req, res) {
  try {
    const { eventId } = req.query;
    const status = cleanText(req.query.status).toLowerCase();
    const type = cleanText(req.query.type).toLowerCase();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const filter = {};

    if (isStaff(req)) {
      if (status && status !== "all") {
        if (!STATUSES.includes(status)) {
          return res.status(400).json({
            message: `status must be one of: ${STATUSES.join(", ")}, all.`,
          });
        }
        filter.status = status;
      } else if (!status) {
        filter.status = { $ne: "archived" };
      }
    } else {
      filter.status = "published";
    }

    // With an eventId: that event's announcements PLUS general ones (no event).
    if (eventId) {
      if (!isValidId(eventId)) {
        return res.status(400).json({ message: "Invalid event ID." });
      }
      filter.$or = [{ eventId }, { eventId: null }];
    }
    if (type) {
      if (!TYPES.includes(type)) {
        return res
          .status(400)
          .json({ message: `type must be one of: ${TYPES.join(", ")}.` });
      }
      filter.type = type;
    }

    const announcements = await Announcement.find(filter)
      .populate("eventId", "title game")
      .populate("createdBy", "firstName lastName role")
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json(announcements);
  } catch (err) {
    console.error("getAnnouncements error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- GET /api/announcements/:id ----------
export async function getAnnouncementById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid announcement ID." });
    }

    const announcement = await Announcement.findById(id)
      .populate("eventId", "title game")
      .populate("createdBy", "firstName lastName role")
      .lean();

    // Drafts and archived items look like they do not exist to non-staff.
    if (
      !announcement ||
      (!isStaff(req) && announcement.status !== "published")
    ) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    return res.json(announcement);
  } catch (err) {
    console.error("getAnnouncementById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- PATCH /api/announcements/:id ----------
// body: any of { title, content, type, eventId (null = make it general) }
export async function updateAnnouncement(req, res) {
  try {
    if (!staffOnly(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid announcement ID." });
    }

    const { title, content, type, eventId } = req.body ?? {};
    if (
      title === undefined &&
      content === undefined &&
      type === undefined &&
      eventId === undefined
    ) {
      return res.status(400).json({
        message: "Send at least one of: title, content, type, eventId.",
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found." });
    }
    if (announcement.status === "archived") {
      return res.status(409).json({
        message: "An archived announcement cannot be edited. Restore it first.",
      });
    }

    if (title !== undefined) {
      const clean = cleanText(title);
      if (!clean || clean.length > 150) {
        return res
          .status(400)
          .json({ message: "title must be 1 to 150 characters." });
      }
      announcement.title = clean;
    }
    if (content !== undefined) {
      const clean = cleanText(content);
      if (!clean || clean.length > 5000) {
        return res
          .status(400)
          .json({ message: "content must be 1 to 5000 characters." });
      }
      announcement.content = clean;
    }
    if (type !== undefined) {
      const clean = cleanText(type).toLowerCase();
      if (!TYPES.includes(clean)) {
        return res
          .status(400)
          .json({ message: `type must be one of: ${TYPES.join(", ")}.` });
      }
      announcement.type = clean;
    }
    if (eventId !== undefined) {
      if (eventId === null) {
        announcement.eventId = null;
      } else {
        if (!(await eventLinkIsValid(eventId, res))) return;
        announcement.eventId = eventId;
      }
    }

    await announcement.save();
    return res.json(announcement);
  } catch (err) {
    console.error("updateAnnouncement error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- PATCH /api/announcements/:id/status ----------
// body: { status: "draft" | "published" | "archived" }
//   draft     -> published : publish (sets publishedAt to now)
//   published -> draft     : unpublish (clears publishedAt)
//   any       -> archived  : archive (keeps publishedAt for history)
//   archived  -> draft     : restore
export async function setStatus(req, res) {
  try {
    if (!staffOnly(req, res)) return;

    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid announcement ID." });
    }
    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: `status must be one of: ${STATUSES.join(", ")}.` });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found." });
    }
    if (announcement.status === status) {
      return res.json(announcement); // nothing to change
    }

    announcement.status = status;
    if (status === "published") announcement.publishedAt = new Date();
    if (status === "draft") announcement.publishedAt = null;

    await announcement.save();
    return res.json(announcement);
  } catch (err) {
    console.error("setStatus error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- DELETE /api/announcements/:id ----------
// Published announcements must be archived first. Drafts and archived ones can go.
export async function deleteAnnouncement(req, res) {
  try {
    if (!staffOnly(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid announcement ID." });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found." });
    }
    if (announcement.status === "published") {
      return res.status(409).json({
        message: "A published announcement must be archived before it is deleted.",
      });
    }

    await announcement.deleteOne();
    return res.json({ message: "Announcement deleted." });
  } catch (err) {
    console.error("deleteAnnouncement error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}