import mongoose from "mongoose";
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import Match, { STATUSES as MATCH_STATUSES } from "../models/Matches.js";
import { normalizeTeamName } from "../utils/rulesEngine.js";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm", 24-hour

// ---------- helpers ----------

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ASSUMPTION: your auth middleware sets req.user = { _id, role }.
function currentUserId(req) {
  return req.user?._id ?? req.user?.id ?? undefined;
}
function isAdmin(req) {
  return req.user?.role === "admin";
}

// Sends a 403 and returns false if the user is not an admin.
function adminOnly(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Admin access required." });
    return false;
  }
  return true;
}

// Returns an error message, or null if the schedule fields are fine.
function scheduleError({ scheduledDate, startTime, endTime }) {
  if (
    scheduledDate !== undefined &&
    scheduledDate !== null &&
    Number.isNaN(new Date(scheduledDate).getTime())
  ) {
    return "scheduledDate is not a valid date.";
  }
  if (startTime && !TIME_RE.test(startTime)) {
    return "startTime must look like HH:mm, for example 10:00.";
  }
  if (endTime && !TIME_RE.test(endTime)) {
    return "endTime must look like HH:mm, for example 11:30.";
  }
  if (startTime && endTime && endTime <= startTime) {
    return "endTime must be later than startTime.";
  }
  return null;
}

// Looks up ACCEPTED registrations of an event by team name (ignores case and
// extra spaces, same as the rules engine). Returns one entry per name,
// or null where no accepted team matches.
async function findAcceptedTeams(eventId, names) {
  const accepted = await Registration.find({ eventId, status: "accepted" })
    .select("teamName")
    .lean();
  const byName = new Map(
    accepted.map((r) => [normalizeTeamName(r.teamName), r]),
  );
  return names.map((n) => byName.get(normalizeTeamName(n)) ?? null);
}

// Finds a match where one of the teams already plays at the same date and time.
async function findTimeConflict({
  eventId,
  teamNames,
  scheduledDate,
  startTime,
  excludeId,
}) {
  if (!scheduledDate || !startTime) return null;
  const filter = {
    eventId,
    scheduledDate,
    startTime,
    status: { $ne: "cancelled" },
    $or: [{ teamA: { $in: teamNames } }, { teamB: { $in: teamNames } }],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Match.findOne(filter).lean();
}

// Loads an event and blocks non-admins when its schedule is not published.
// Returns the event, or null after sending an error response.
async function loadVisibleEvent(req, res, eventId) {
  if (!isValidId(eventId)) {
    res.status(400).json({ message: "Invalid event ID." });
    return null;
  }
  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404).json({ message: "Event not found." });
    return null;
  }
  if (!isAdmin(req) && !event.isSchedulePublished) {
    res.status(403).json({ message: "The schedule is not published yet." });
    return null;
  }
  return event;
}

// ---------- POST /api/events/:eventId/matches ----------
// body: { teamA, teamB, round, stage, matchNumber, scheduledDate, startTime, endTime }
export async function createMatch(req, res) {
  try {
    if (!adminOnly(req, res)) return;

    const { eventId } = req.params;
    const {
      teamA,
      teamB,
      round,
      stage,
      matchNumber,
      scheduledDate,
      startTime,
      endTime,
    } = req.body;

    if (!isValidId(eventId)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    if (event.isArchived) {
      return res.status(403).json({ message: "This event is archived." });
    }

    if (!normalizeTeamName(teamA) || !normalizeTeamName(teamB)) {
      return res
        .status(400)
        .json({ message: "teamA and teamB are required." });
    }
    if (normalizeTeamName(teamA) === normalizeTeamName(teamB)) {
      return res.status(400).json({ message: "A team cannot play itself." });
    }
    if (
      matchNumber !== undefined &&
      (!Number.isInteger(matchNumber) || matchNumber < 1)
    ) {
      return res
        .status(400)
        .json({ message: "matchNumber must be a whole number, 1 or higher." });
    }
    const badSchedule = scheduleError({ scheduledDate, startTime, endTime });
    if (badSchedule) {
      return res.status(400).json({ message: badSchedule });
    }

    // Both teams must be ACCEPTED teams of this same event.
    const [regA, regB] = await findAcceptedTeams(eventId, [teamA, teamB]);
    if (!regA || !regB) {
      return res.status(400).json({
        message: "Both teams must be accepted registrations of this event.",
      });
    }

    if (matchNumber !== undefined) {
      const sameNumber = await Match.findOne({
        eventId,
        matchNumber,
        status: { $ne: "cancelled" },
      }).lean();
      if (sameNumber) {
        return res.status(409).json({
          message: `Match number ${matchNumber} already exists for this event.`,
        });
      }
    }

    const conflict = await findTimeConflict({
      eventId,
      teamNames: [regA.teamName, regB.teamName],
      scheduledDate,
      startTime,
    });
    if (conflict) {
      return res.status(409).json({
        message: "One of these teams already has a match at that date and time.",
      });
    }

    const match = await Match.create({
      eventId,
      teamA: regA.teamName, // saved with the official spelling
      teamB: regB.teamName,
      round,
      stage,
      matchNumber,
      scheduledDate,
      startTime,
      endTime,
      status: "scheduled",
      createdBy: currentUserId(req),
    });

    return res.status(201).json(match);
  } catch (err) {
    console.error("createMatch error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- GET /api/events/:eventId/matches?status=&round=&stage= ----------
export async function getMatchesByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { status, round, stage } = req.query;

    const event = await loadVisibleEvent(req, res, eventId);
    if (!event) return;

    if (status && !MATCH_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${MATCH_STATUSES.join(", ")}.`,
      });
    }

    const filter = { eventId };
    if (status) filter.status = status;
    if (round) filter.round = round;
    if (stage) filter.stage = stage;

    const matches = await Match.find(filter)
      .populate("winner", "teamName")
      .sort({ matchNumber: 1, scheduledDate: 1, startTime: 1 })
      .lean();

    return res.json(matches);
  } catch (err) {
    console.error("getMatchesByEvent error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- GET /api/matches/:id ----------
export async function getMatchById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid match ID." });
    }

    const match = await Match.findById(id)
      .populate("winner", "teamName")
      .lean();
    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }

    const event = await loadVisibleEvent(req, res, String(match.eventId));
    if (!event) return;

    return res.json(match);
  } catch (err) {
    console.error("getMatchById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- PATCH /api/matches/:id ----------
// Reschedule only: { round, stage, matchNumber, scheduledDate, startTime, endTime }
export async function updateMatch(req, res) {
  try {
    if (!adminOnly(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid match ID." });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }
    if (["completed", "cancelled"].includes(match.status)) {
      return res.status(409).json({
        message: `A ${match.status} match cannot be edited.`,
      });
    }

    const { round, stage, matchNumber, scheduledDate, startTime, endTime } =
      req.body;

    if (
      matchNumber !== undefined &&
      (!Number.isInteger(matchNumber) || matchNumber < 1)
    ) {
      return res
        .status(400)
        .json({ message: "matchNumber must be a whole number, 1 or higher." });
    }

    // Validate the schedule as it WILL look after the change.
    const next = {
      scheduledDate:
        scheduledDate !== undefined ? scheduledDate : match.scheduledDate,
      startTime: startTime !== undefined ? startTime : match.startTime,
      endTime: endTime !== undefined ? endTime : match.endTime,
    };
    const badSchedule = scheduleError(next);
    if (badSchedule) {
      return res.status(400).json({ message: badSchedule });
    }

    if (matchNumber !== undefined && matchNumber !== match.matchNumber) {
      const sameNumber = await Match.findOne({
        eventId: match.eventId,
        matchNumber,
        status: { $ne: "cancelled" },
        _id: { $ne: match._id },
      }).lean();
      if (sameNumber) {
        return res.status(409).json({
          message: `Match number ${matchNumber} already exists for this event.`,
        });
      }
    }

    if (scheduledDate !== undefined || startTime !== undefined) {
      const conflict = await findTimeConflict({
        eventId: match.eventId,
        teamNames: [match.teamA, match.teamB],
        scheduledDate: next.scheduledDate,
        startTime: next.startTime,
        excludeId: match._id,
      });
      if (conflict) {
        return res.status(409).json({
          message:
            "One of these teams already has a match at that date and time.",
        });
      }
    }

    if (round !== undefined) match.round = round;
    if (stage !== undefined) match.stage = stage;
    if (matchNumber !== undefined) match.matchNumber = matchNumber;
    if (scheduledDate !== undefined) match.scheduledDate = scheduledDate;
    if (startTime !== undefined) match.startTime = startTime;
    if (endTime !== undefined) match.endTime = endTime;

    await match.save();
    return res.json(match);
  } catch (err) {
    console.error("updateMatch error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- PATCH /api/matches/:id/result ----------
// body: { scoreA: 2, scoreB: 1 }. The winner is worked out from the scores.
export async function recordResult(req, res) {
  try {
    if (!adminOnly(req, res)) return;

    const { id } = req.params;
    const { scoreA, scoreB } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid match ID." });
    }
    if (
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0
    ) {
      return res.status(400).json({
        message: "scoreA and scoreB must be whole numbers, 0 or higher.",
      });
    }
    if (scoreA === scoreB) {
      return res.status(400).json({
        message: "A match needs a winner, so the scores cannot be tied.",
      });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }
    if (match.status === "cancelled") {
      return res
        .status(409)
        .json({ message: "A cancelled match cannot have a result." });
    }

    // "winner" in your model is a Registration ID, so find it by team name.
    const winnerName = scoreA > scoreB ? match.teamA : match.teamB;
    const [winnerReg] = await findAcceptedTeams(match.eventId, [winnerName]);
    if (!winnerReg) {
      return res.status(409).json({
        message: `${winnerName} is no longer an accepted team of this event.`,
      });
    }

    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.winner = winnerReg._id;
    match.status = "completed";
    await match.save();

    return res.json(match);
  } catch (err) {
    console.error("recordResult error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- PATCH /api/matches/:id/cancel ----------
export async function cancelMatch(req, res) {
  try {
    if (!adminOnly(req, res)) return;

    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid match ID." });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }
    if (match.status === "completed") {
      return res
        .status(409)
        .json({ message: "A completed match cannot be cancelled." });
    }
    if (match.status === "cancelled") {
      return res.json(match);
    }

    match.status = "cancelled";
    await match.save();
    return res.json(match);
  } catch (err) {
    console.error("cancelMatch error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

// ---------- GET /api/events/:eventId/standings ----------
// Worked out from COMPLETED matches. Nothing is written to the database.
export async function getStandings(req, res) {
  try {
    const { eventId } = req.params;

    const event = await loadVisibleEvent(req, res, eventId);
    if (!event) return;

    const matches = await Match.find({ eventId, status: "completed" }).lean();

    const table = new Map();
    const row = (teamName) => {
      const key = normalizeTeamName(teamName);
      if (!table.has(key)) {
        table.set(key, {
          teamName,
          played: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        });
      }
      return table.get(key);
    };

    for (const m of matches) {
      const a = row(m.teamA);
      const b = row(m.teamB);
      a.played++;
      b.played++;
      a.pointsFor += m.scoreA;
      a.pointsAgainst += m.scoreB;
      b.pointsFor += m.scoreB;
      b.pointsAgainst += m.scoreA;
      if (m.scoreA > m.scoreB) {
        a.wins++;
        b.losses++;
      } else {
        b.wins++;
        a.losses++;
      }
    }

    const standings = [...table.values()]
      .map((r) => ({ ...r, pointDiff: r.pointsFor - r.pointsAgainst }))
      .sort((x, y) => y.wins - x.wins || y.pointDiff - x.pointDiff);

    return res.json(standings);
  } catch (err) {
    console.error("getStandings error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}