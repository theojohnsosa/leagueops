
import Event from "../models/Events.js";
import EventLog from "../models/EventLog.js";
import AuditLog from "../models/AuditLogs.js";

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

let isRunning = false;

export async function expireArchivedEvents() {
  if (isRunning) return;

  isRunning = true;

  try {
    const expirationCutoff = new Date(Date.now() - RESTORE_WINDOW_MS);

    const expiredEvents = await Event.find({
      isArchived: true,
      archiveStatus: { $ne: "expired" },
      archivedAt: { $lte: expirationCutoff },
    });

    for (const event of expiredEvents) {
      // Update only if the event is still eligible for expiration.
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: event._id,
          isArchived: true,
          archiveStatus: { $ne: "expired" },
          archivedAt: { $lte: expirationCutoff },
        },
        { $set: { archiveStatus: "expired" } },
        { new: true },
      );

      if (!updatedEvent) continue;

      const description =
        "The 7-day archive restore window expired automatically.";

      await Promise.all([
        EventLog.create({
          eventId: updatedEvent._id,
          actorName: "System",
          actorRole: "system",
          action: "EVENT_ARCHIVE_EXPIRED",
          description,
        }),
        AuditLog.create({
          actorName: "System",
          actorRole: "system",
          action: "EVENT_ARCHIVE_EXPIRED",
          targetType: "Event",
          targetId: updatedEvent._id,
          description,
        }),
      ]);

      console.log(
        `Archive expired: ${updatedEvent.title} (${updatedEvent._id})`,
      );
    }

    if (expiredEvents.length > 0) {
      console.log(`Expired ${expiredEvents.length} archived event(s).`);
    }
  } catch (error) {
    console.error("Archive expiration job failed:", error);
  } finally {
    isRunning = false;
  }
}

export function startArchiveExpirationJob() {
  // Run immediately when the server starts.
  void expireArchivedEvents();

  // Then check every minute.
  const interval = setInterval(() => {
    void expireArchivedEvents();
  }, CHECK_INTERVAL_MS);

  // Allow Node to exit naturally when shutting down.
  interval.unref();

  console.log("Archive expiration job started.");
}
