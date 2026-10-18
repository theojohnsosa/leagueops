import Event from "../models/Events.js";
import EventLog from "../models/EventLog.js";
import AuditLog from "../models/AuditLogs.js";

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function expireArchivedEvents() {
  const cutoff = new Date(Date.now() - RESTORE_WINDOW_MS);

  const expiredEvents = await Event.find({
    isArchived: true,
    archiveStatus: "archived",
    archivedAt: { $lte: cutoff },
  }).select("_id archivedBy createdBy");

  let expiredCount = 0;

  for (const event of expiredEvents) {
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: event._id,
        isArchived: true,
        archiveStatus: "archived",
        archivedAt: { $lte: cutoff },
      },
      { $set: { archiveStatus: "expired" } },
      { new: true },
    );

    if (!updatedEvent) continue;

    const actorId = updatedEvent.archivedBy ?? updatedEvent.createdBy;

    await Promise.all([
      EventLog.create({
        eventId: updatedEvent._id,
        actorId,
        actorName: "System",
        actorRole: "system",
        action: "EVENT_ARCHIVE_EXPIRED",
        description: "The 7-day archive restore window expired.",
      }),
      AuditLog.create({
        actorId,
        actorName: "System",
        actorRole: "system",
        action: "EVENT_ARCHIVE_EXPIRED",
        targetType: "Event",
        targetId: updatedEvent._id,
        description: "The 7-day archive restore window expired.",
      }),
    ]);

    expiredCount += 1;
  }

  return expiredCount;
}
