import AuditLog from "../models/AuditLogs.js";
import EventLog from "../models/EventLog.js";

function actorDetails(user) {
  return {
    actorId: user?._id,
    actorName: user?.name ?? user?.fullName ?? user?.email ?? "System",
    actorRole: user?.role ?? "system",
  };
}

export async function logAudit({
  actor,
  action,
  targetType,
  targetId,
  description,
  session,
}) {
  const record = new AuditLog({
    ...actorDetails(actor),
    action,
    targetType,
    targetId,
    description,
  });

  return record.save(session ? { session } : undefined);
}

export async function logEvent({
  eventId,
  actor,
  action,
  description,
  changes,
  session,
}) {
  const record = new EventLog({
    eventId,
    ...actorDetails(actor),
    action,
    description,
    changes,
  });

  return record.save(session ? { session } : undefined);
}
