import Event from "../models/Events.js";
import EventLog from "../models/EventLog.js";
import AuditLog from "../models/AuditLogs.js";

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

let isRunning = false;
let intervalId = null;

export async function expireArchivedEvents() {
  if (isRunning) return 0;

  isRunning = true;
  let expiredCount = 0;

  try {
    const cutoff = new Date(Date.now() - RESTORE_WINDOW_MS);

    const events = await Event.find({
      isArchived: true,
      archiveStatus: "archived",
      archivedAt: { $lte: cutoff },
    }).select("_id title");

    for (const event of events) {
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: event._id,
          isArchived: true,
          archiveStatus: "archived",
          archivedAt: { $lte: cutoff },
        },
        {
          $set: { archiveStatus: "expired" },
        },
        { new: true },
      );

      if (!updatedEvent) continue;

      expiredCount++;

      const description =
        "The 7-day archive restore window expired automatically.";

      console.log(
        `Archive expired: ${updatedEvent.title} (${updatedEvent._id})`,
      );

      const results = await Promise.allSettled([
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

      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            `Failed to write expiration log for event ${updatedEvent._id}:`,
            result.reason,
          );
        }
      });
    }

    if (expiredCount > 0) {
      console.log(`Expired ${expiredCount} archived event(s).`);
    }

    return expiredCount;
  } catch (error) {
    console.error("Archive expiration job failed:", error);
    return expiredCount;
  } finally {
    isRunning = false;
  }
}

export function startArchiveExpirationJob() {
  if (intervalId) return;

  void expireArchivedEvents();

  intervalId = setInterval(() => {
    void expireArchivedEvents();
  }, CHECK_INTERVAL_MS);

  intervalId.unref();

  console.log("Archive expiration job started.");
}
