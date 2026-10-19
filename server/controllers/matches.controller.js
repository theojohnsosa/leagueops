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
function adminOnly() {
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
  // if (!isAdmin(req) && !event.isSchedulePublished) {
  //   res.status(403).json({ message: "The schedule is not published yet." });
  //   return null;
  // }
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
      return res.status(400).json({ message: "teamA and teamB are required." });
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
    const nameA = String(teamA).trim();
    const nameB = String(teamB).trim();

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
      teamNames: [nameA, nameB],
      scheduledDate,
      startTime,
    });
    if (conflict) {
      return res.status(409).json({
        message:
          "One of these teams already has a match at that date and time.",
      });
    }

    const match = await Match.create({
      eventId,
      teamA: nameA,
      teamB: nameB,
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
// Edits any part of a match. Send only the fields that changed:
//   schedule: { round, stage, matchNumber, scheduledDate, startTime, endTime }
//   teams:    { teamA, teamB }            (must be accepted teams of the event)
//   result:   { scoreA, scoreB }          (both numbers, or both null to clear)
//   manual:   { winner, status }          (winner = team name, "" clears it)
//
// Rules by status:
//   scheduled / ongoing / cancelled: any score is fine (0 - 0 and ties too),
//                                    and no winner is needed.
//   completed:                       the score cannot be tied and a winner is
//                                    required. This is the only status with
//                                    result checks.
//
// For a completed match, if you don't send a winner it is worked out from the
// score. A winner you send always wins over the automatic one.
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

    const {
      round,
      stage,
      matchNumber,
      scheduledDate,
      startTime,
      endTime,
      teamA,
      teamB,
      status,
      winner,
      scoreA,
      scoreB,
    } = req.body;

    if (
      matchNumber !== undefined &&
      (!Number.isInteger(matchNumber) || matchNumber < 1)
    ) {
      return res
        .status(400)
        .json({ message: "matchNumber must be a whole number, 1 or higher." });
    }

    if (status !== undefined && !MATCH_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${MATCH_STATUSES.join(", ")}.`,
      });
    }

    // ----- score (ties and 0 - 0 are fine here; "completed" is checked below) -----
    const scoreSent = scoreA !== undefined || scoreB !== undefined;
    const scoreCleared = scoreA === null && scoreB === null;
    const newScore = scoreSent && !scoreCleared;
    let nextScoreA = match.scoreA;
    let nextScoreB = match.scoreB;

    if (scoreSent) {
      if (scoreCleared) {
        nextScoreA = undefined;
        nextScoreB = undefined;
      } else {
        if (
          !Number.isInteger(scoreA) ||
          !Number.isInteger(scoreB) ||
          scoreA < 0 ||
          scoreB < 0
        ) {
          return res.status(400).json({
            message:
              "scoreA and scoreB must be whole numbers, 0 or higher (or both null to clear the score).",
          });
        }
        nextScoreA = scoreA;
        nextScoreB = scoreB;
      }
    }
    const hasScore = nextScoreA != null && nextScoreB != null;

    // ----- status -----
    const nextStatus = status !== undefined ? status : match.status;
    const completing = nextStatus === "completed";

    if (completing && hasScore && nextScoreA === nextScoreB) {
      return res.status(400).json({
        message: "A completed match cannot have a tied score.",
      });
    }

    // ----- teams -----
    let nextTeamA = match.teamA;
    let nextTeamB = match.teamB;

    if (teamA !== undefined) {
      if (!normalizeTeamName(teamA)) {
        return res.status(400).json({ message: "teamA cannot be empty." });
      }
      nextTeamA = String(teamA).trim();
    }
    if (teamB !== undefined) {
      if (!normalizeTeamName(teamB)) {
        return res.status(400).json({ message: "teamB cannot be empty." });
      }
      nextTeamB = String(teamB).trim();
    }
    if (normalizeTeamName(nextTeamA) === normalizeTeamName(nextTeamB)) {
      return res.status(400).json({ message: "A team cannot play itself." });
    }

    const changedA =
      normalizeTeamName(nextTeamA) !== normalizeTeamName(match.teamA);
    const changedB =
      normalizeTeamName(nextTeamB) !== normalizeTeamName(match.teamB);
    const teamsChanged = changedA || changedB;

    if (teamsChanged) {
      // Only the teams that actually changed have to be accepted teams.
      const names = [];
      if (changedA) names.push(nextTeamA);
      if (changedB) names.push(nextTeamB);
      const found = await findAcceptedTeams(match.eventId, names);
      const missing = names.filter((_, i) => !found[i]);
      if (missing.length > 0) {
        return res.status(409).json({
          message: `${missing.join(" and ")} ${
            missing.length === 1 ? "is" : "are"
          } not accepted in this event.`,
        });
      }
      let i = 0;
      if (changedA) nextTeamA = found[i++].teamName;
      if (changedB) nextTeamB = found[i++].teamName;
    }

    // ----- schedule -----
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

    const scheduleTouched =
      scheduledDate !== undefined || startTime !== undefined;
    if ((scheduleTouched || teamsChanged) && nextStatus !== "cancelled") {
      const conflict = await findTimeConflict({
        eventId: match.eventId,
        teamNames: [nextTeamA, nextTeamB],
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

    // ----- winner -----
    let nextWinner = match.winner;

    // Winner worked out from the score (only when completing, no tie).
    const scoreWinnerName =
      completing && hasScore && nextScoreA !== nextScoreB
        ? nextScoreA > nextScoreB
          ? nextTeamA
          : nextTeamB
        : null;

    async function winnerIdFor(name) {
      const [reg] = await findAcceptedTeams(match.eventId, [name]);
      return reg?._id ?? null;
    }

    if (winner !== undefined) {
      if (winner === null || winner === "") {
        nextWinner = undefined;
      } else {
        const key = normalizeTeamName(winner);
        if (
          key !== normalizeTeamName(nextTeamA) &&
          key !== normalizeTeamName(nextTeamB)
        ) {
          return res.status(400).json({
            message: "The winner must be one of the two teams in this match.",
          });
        }
        const winnerId = await winnerIdFor(winner);
        if (!winnerId) {
          return res.status(409).json({
            message: `${winner} is not accepted in this event.`,
          });
        }
        nextWinner = winnerId;
      }
    } else if (scoreWinnerName && (newScore || !nextWinner)) {
      const winnerId = await winnerIdFor(scoreWinnerName);
      if (!winnerId) {
        return res.status(409).json({
          message: `${scoreWinnerName} is no longer an accepted team of this event.`,
        });
      }
      nextWinner = winnerId;
    } else if (teamsChanged && match.winner) {
      // Teams changed but no new winner was sent: the old winner must still play.
      const old = await Registration.findById(match.winner)
        .select("teamName")
        .lean();
      const key = normalizeTeamName(old?.teamName);
      if (
        key !== normalizeTeamName(nextTeamA) &&
        key !== normalizeTeamName(nextTeamB)
      ) {
        return res.status(400).json({
          message:
            "The current winner is not in this match any more. Pick a new winner.",
        });
      }
    }

    if (completing && !nextWinner) {
      return res.status(400).json({
        message:
          "Pick a winner or enter a score before marking a match completed.",
      });
    }

    // ----- save -----
    match.teamA = nextTeamA;
    match.teamB = nextTeamB;
    match.scoreA = nextScoreA;
    match.scoreB = nextScoreB;
    match.winner = nextWinner;
    match.status = nextStatus;

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
// Uses the saved winner first (so a manually set winner counts), and falls
// back to the score when there is no usable winner.
export async function getStandings(req, res) {
  try {
    const { eventId } = req.params;

    const event = await loadVisibleEvent(req, res, eventId);
    if (!event) return;

    const matches = await Match.find({ eventId, status: "completed" })
      .populate("winner", "teamName")
      .lean();

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

      const hasScore = m.scoreA != null && m.scoreB != null;
      if (hasScore) {
        a.pointsFor += m.scoreA;
        a.pointsAgainst += m.scoreB;
        b.pointsFor += m.scoreB;
        b.pointsAgainst += m.scoreA;
      }

      const winKey = normalizeTeamName(m.winner?.teamName);
      let won = null; // "a" | "b" | null
      if (winKey && winKey === normalizeTeamName(m.teamA)) won = "a";
      else if (winKey && winKey === normalizeTeamName(m.teamB)) won = "b";
      else if (hasScore) won = m.scoreA > m.scoreB ? "a" : "b";

      if (won === "a") {
        a.wins++;
        b.losses++;
      } else if (won === "b") {
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
