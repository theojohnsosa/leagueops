const ACTIVE_STATUSES = ["pending", "accepted"];

export function normalizeTeamName(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isActive(registration) {
  return ACTIVE_STATUSES.includes(registration.status);
}

function studentIdsOf(registration) {
  return (registration.playerDetails ?? [])
    .map((player) => String(player.studentId ?? "").trim())
    .filter(Boolean);
}

function error(code, message) {
  return { code, message };
}

// ---------- the six rules ----------
// Each rule returns an array of errors. An empty array means "this rule passed".

// Rule 1: registration window
export function checkRegistrationWindow(event, now = new Date()) {
  const open = event.registrationOpenDate
    ? new Date(event.registrationOpenDate)
    : null;
  const close = event.registrationClosedDate
    ? new Date(event.registrationClosedDate)
    : null;

  if (!open || !close) {
    return [
      error(
        "REGISTRATION_CLOSED",
        "Registration dates are not set for this event.",
      ),
    ];
  }
  if (now < open) {
    return [error("REGISTRATION_CLOSED", "Registration has not opened yet.")];
  }
  if (now > close) {
    return [error("REGISTRATION_CLOSED", "Registration is closed.")];
  }
  return [];
}

// Rule 2: slot cap (only ACCEPTED teams use up a slot)
export function checkSlotCap(event, existingRegistrations) {
  if (event.maxSlots == null) return []; // no cap set
  const accepted = existingRegistrations.filter(
    (r) => r.status === "accepted",
  ).length;
  if (accepted >= event.maxSlots) {
    return [error("SLOTS_FULL", "All slots for this event are taken.")];
  }
  return [];
}

// Rule 3: team name must be unique in the event (ignores case and extra spaces)
export function checkDuplicateTeamName(newRegistration, existingRegistrations) {
  const wanted = normalizeTeamName(newRegistration.teamName);
  if (wanted === "") {
    return [error("MISSING_TEAM_NAME", "A team name is required.")];
  }
  const taken = existingRegistrations.some(
    (r) => isActive(r) && normalizeTeamName(r.teamName) === wanted,
  );
  return taken
    ? [error("DUPLICATE_TEAM_NAME", "That team name is already taken.")]
    : [];
}

// Rule 4: the exact same roster cannot be registered twice (order does not matter)
export function checkDuplicateRoster(newRegistration, existingRegistrations) {
  const key = (ids) => [...ids].sort().join("|");
  const newIds = studentIdsOf(newRegistration);
  if (newIds.length === 0) return [];
  const same = existingRegistrations.some(
    (r) => isActive(r) && key(studentIdsOf(r)) === key(newIds),
  );
  return same
    ? [error("DUPLICATE_ROSTER", "This exact roster is already registered.")]
    : [];
}

// Rule 5: roster must have exactly playersPerTeam players, with no repeats
// Rule 5: roster must have exactly playersPerTeam players, with no blanks or repeats
export function checkRosterSize(event, newRegistration) {
  const raw = (newRegistration.playerDetails ?? []).map((player) =>
    String(player.studentId ?? "").trim(),
  );
  const ids = raw.filter(Boolean);
  const blanks = raw.length - ids.length;
  const errors = [];

  if (ids.length !== event.playersPerTeam || blanks > 0) {
    const base = `A team needs exactly ${event.playersPerTeam} players.`;
    errors.push(
      error(
        "INVALID_ROSTER_SIZE",
        blanks > 0 ? `${base} ${blanks} player(s) have no student ID.` : base,
      ),
    );
  }
  if (new Set(ids).size !== ids.length) {
    errors.push(
      error(
        "ROSTER_HAS_DUPLICATES",
        "The same player is listed more than once.",
      ),
    );
  }
  return errors;
}

// Rule 6: a player cannot be on two ACCEPTED teams in the same event
export function checkPlayerConflicts(newRegistration, existingRegistrations) {
  const taken = new Set();
  for (const r of existingRegistrations) {
    if (r.status === "accepted") studentIdsOf(r).forEach((id) => taken.add(id));
  }
  const conflicts = studentIdsOf(newRegistration).filter((id) => taken.has(id));
  if (conflicts.length === 0) return [];
  return [
    error(
      "PLAYER_ALREADY_REGISTERED",
      `Already on an accepted team: ${conflicts.join(", ")}.`,
    ),
  ];
}

export function validateRegistration(
  event,
  newRegistration,
  existingRegistrations,
  now = new Date(),
) {
  const errors = [
    ...checkRegistrationWindow(event, now),
    ...checkSlotCap(event, existingRegistrations),
    ...checkDuplicateTeamName(newRegistration, existingRegistrations),
    ...checkDuplicateRoster(newRegistration, existingRegistrations),
    ...checkRosterSize(event, newRegistration),
    ...checkPlayerConflicts(newRegistration, existingRegistrations),
  ];
  return { ok: errors.length === 0, errors };
}
