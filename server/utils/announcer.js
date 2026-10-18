import Announcement from "../models/Announcements.js";

export async function createAnnouncement({
  title,
  content,
  type = "general",
  eventId = null,
  actor,
  publish = false,
  session,
}) {
  if (!actor?._id) {
    throw new Error("An authenticated actor is required.");
  }

  const announcement = new Announcement({
    title,
    content,
    type,
    eventId,
    createdBy: actor._id,
    status: publish ? "published" : "draft",
    publishedAt: publish ? new Date() : null,
  });

  return announcement.save(session ? { session } : undefined);
}
