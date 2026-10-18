import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../../components/Header.jsx";
import { api, errorMessage } from "../../lib/api.js";

// ASSUMPTION: stage is a free label in your model, so these are suggestions.
const STAGES = ["Group Stage", "Playoffs", "Finals"];

const STATUS_LABELS = {
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE = {
  scheduled: "bg-gray-100 text-gray-700",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-slate-700 text-white",
  cancelled: "bg-red-100 text-red-700",
};

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0038a8] focus:outline-none focus:ring-2 focus:ring-[#0038a8]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500";

// "2026-11-15T00:00:00.000Z" -> "2026-11-15"
function dateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// "2 - 1" -> { a: 2, b: 1 }. Empty -> null. Anything else -> "invalid".
function parseScore(text) {
  const t = (text ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(\d+)\s*[-:–]\s*(\d+)$/);
  return m ? { a: Number(m[1]), b: Number(m[2]) } : "invalid";
}

function matchTitle(m) {
  return `${m.teamA ?? "TBD"} vs ${m.teamB ?? "TBD"}`;
}

const isLocked = (m) => ["completed", "cancelled"].includes(m.status);

/* ---------- small icons ---------- */

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const Pencil = () => (
  <Icon>
    <path d="M13 4l3 3-8 8H5v-3l8-8z" />
  </Icon>
);
const Trash = () => (
  <Icon>
    <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10M9 9v4M11 9v4" />
  </Icon>
);
const Close = () => (
  <Icon>
    <path d="M5 5l10 10M15 5L5 15" />
  </Icon>
);
const Check = () => (
  <Icon>
    <path d="M4 10l4 4 8-8" />
  </Icon>
);

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/* ---------- Add / Edit Match modal ---------- */

function MatchModal({ eventId, match, teams, nextNumber, onClose, onChanged }) {
  const editing = Boolean(match);
  const cancelled = editing && match.status === "cancelled";
  const locked = editing && isLocked(match);

  const [form, setForm] = useState(() => ({
    matchNumber: String(match?.matchNumber ?? nextNumber),
    round: match?.round ?? "",
    teamA: match?.teamA ?? "",
    teamB: match?.teamB ?? "",
    date: dateOnly(match?.scheduledDate),
    stage: match?.stage ?? "",
    startTime: match?.startTime ?? "",
    endTime: match?.endTime ?? "",
    score:
      match && match.scoreA != null && match.scoreB != null
        ? `${match.scoreA} - ${match.scoreB}`
        : "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  const teamOptions = useMemo(() => {
    const names = new Set(teams.map((t) => t.teamName));
    if (form.teamA) names.add(form.teamA);
    if (form.teamB) names.add(form.teamB);
    return [...names];
  }, [teams, form.teamA, form.teamB]);

  // Winner and status are worked out by the server from the score,
  // so here they only preview what will happen.
  const parsed = parseScore(form.score);
  const scoreOk = parsed && parsed !== "invalid" && parsed.a !== parsed.b;
  const winner = scoreOk
    ? parsed.a > parsed.b
      ? form.teamA
      : form.teamB
    : (match?.winner?.teamName ?? "");
  const shownStatus = cancelled
    ? "cancelled"
    : scoreOk
      ? "completed"
      : (match?.status ?? "scheduled");

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.round.trim()) return setError("Round is required.");
    if (!editing && (!form.teamA.trim() || !form.teamB.trim())) {
      return setError("Enter both team names.");
    }
    if (
      form.teamA &&
      form.teamA.trim().toLowerCase() === form.teamB.trim().toLowerCase()
    ) {
      return setError("A team cannot play itself.");
    }
    if (form.teamA && form.teamA === form.teamB) {
      return setError("A team cannot play itself.");
    }
    if (parsed === "invalid") {
      return setError("Enter the score like 2 - 1.");
    }
    const number =
      form.matchNumber === "" ? undefined : Number(form.matchNumber);
    if (number !== undefined && (!Number.isInteger(number) || number < 1)) {
      return setError("Match # must be a whole number, 1 or higher.");
    }

    setSaving(true);
    try {
      if (!editing) {
        const body = {
          teamA: form.teamA.trim(),
          teamB: form.teamB.trim(),
          round: form.round.trim(),
        };
        if (number !== undefined) body.matchNumber = number;
        if (form.stage) body.stage = form.stage;
        if (form.date) body.scheduledDate = form.date;
        if (form.startTime) body.startTime = form.startTime;
        if (form.endTime) body.endTime = form.endTime;
        await api.post(`/events/${eventId}/matches`, body);
      } else {
        // 1) Reschedule: send only what changed (the server rejects edits to
        //    completed or cancelled matches, so skip them there).
        if (!locked) {
          const changes = {};
          if (form.round.trim() !== (match.round ?? "")) {
            changes.round = form.round.trim();
          }
          if (form.stage !== (match.stage ?? "")) changes.stage = form.stage;
          if (number !== undefined && number !== match.matchNumber) {
            changes.matchNumber = number;
          }
          if (form.date && form.date !== dateOnly(match.scheduledDate)) {
            changes.scheduledDate = form.date;
          }
          if (form.startTime && form.startTime !== (match.startTime ?? "")) {
            changes.startTime = form.startTime;
          }
          if (form.endTime && form.endTime !== (match.endTime ?? "")) {
            changes.endTime = form.endTime;
          }
          if (Object.keys(changes).length > 0) {
            await api.patch(`/matches/${match._id}`, changes);
          }
        }
        // 2) Score: the server sets the winner and marks the match completed.
        if (
          !cancelled &&
          parsed &&
          (parsed.a !== match.scoreA || parsed.b !== match.scoreB)
        ) {
          await api.patch(`/matches/${match._id}/result`, {
            scoreA: parsed.a,
            scoreB: parsed.b,
          });
        }
      }
      await onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      await onChanged(); // a partial save may have gone through
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-modal-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 id="match-modal-title" className="text-lg font-bold">
            {editing ? "Edit Match" : "Add Match"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Close />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          {locked && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {cancelled
                ? "A cancelled match cannot be edited."
                : "A completed match cannot be rescheduled. You can still correct its score."}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Match #" htmlFor="m-number">
              <input
                id="m-number"
                type="number"
                min="1"
                value={form.matchNumber}
                onChange={(e) => set("matchNumber", e.target.value)}
                disabled={locked}
                className={fieldClass}
              />
            </Field>
            <Field label="Round *" htmlFor="m-round">
              <input
                id="m-round"
                type="text"
                value={form.round}
                onChange={(e) => set("round", e.target.value)}
                disabled={locked}
                placeholder="Quarterfinal"
                className={fieldClass}
              />
            </Field>

            <Field label="Team A" htmlFor="m-teamA">
              {editing ? (
                <select
                  id="m-teamA"
                  value={form.teamA}
                  onChange={(e) => set("teamA", e.target.value)}
                  disabled
                  className={fieldClass}
                >
                  <option value="">TBD</option>
                  {teamOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="m-teamA"
                  type="text"
                  value={form.teamA}
                  onChange={(e) => set("teamA", e.target.value)}
                  placeholder="Team name"
                  className={fieldClass}
                />
              )}
            </Field>
            <Field label="Team B" htmlFor="m-teamB">
              {editing ? (
                <select
                  id="m-teamB"
                  value={form.teamB}
                  onChange={(e) => set("teamB", e.target.value)}
                  disabled
                  className={fieldClass}
                >
                  <option value="">TBD</option>
                  {teamOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="m-teamB"
                  type="text"
                  value={form.teamB}
                  onChange={(e) => set("teamB", e.target.value)}
                  placeholder="Team name"
                  className={fieldClass}
                />
              )}
            </Field>

            <Field label="Date" htmlFor="m-date">
              <input
                id="m-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                disabled={locked}
                className={fieldClass}
              />
            </Field>
            <Field label="Stage" htmlFor="m-stage">
              <select
                id="m-stage"
                value={form.stage}
                onChange={(e) => set("stage", e.target.value)}
                disabled={locked}
                className={fieldClass}
              >
                <option value=""></option>
                {[...new Set([...STAGES, form.stage].filter(Boolean))].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Start Time" htmlFor="m-start">
              <input
                id="m-start"
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                disabled={locked}
                className={fieldClass}
              />
            </Field>
            <Field label="End Time" htmlFor="m-end">
              <input
                id="m-end"
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                disabled={locked}
                className={fieldClass}
              />
            </Field>

            {editing && (
              <>
                <Field label="Winner" htmlFor="m-winner">
                  <select
                    id="m-winner"
                    value={winner}
                    disabled
                    className={fieldClass}
                  >
                    <option value="">TBD</option>
                    {[form.teamA, form.teamB].filter(Boolean).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Match Status" htmlFor="m-status">
                  <select
                    id="m-status"
                    value={shownStatus}
                    disabled
                    className={fieldClass}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>

          {editing && (
            <Field label="Score" htmlFor="m-score">
              <input
                id="m-score"
                type="text"
                inputMode="numeric"
                value={form.score}
                onChange={(e) => set("score", e.target.value)}
                disabled={cancelled}
                placeholder="2 - 1"
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-gray-500">
                Winner and status are set automatically when you save a score.
              </p>
            </Field>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || cancelled}
            className="w-full rounded-lg bg-[#0038a8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002f8f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Update Match" : "Add Match"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Bracket tab (built from matches, grouped by round) ---------- */

function Bracket({ matches }) {
  const rounds = useMemo(() => {
    const map = new Map();
    for (const m of matches) {
      const key = m.round?.trim() || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map];
  }, [matches]);

  if (rounds.length === 0) {
    return (
      <p className="py-10 text-center text-gray-500">
        No matches yet. Add matches to see them grouped by round here.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rounds.map(([round, list]) => (
        <div key={round} className="w-60 shrink-0">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{round}</h3>
          <div className="grid gap-2">
            {list.map((m) => {
              const winnerName = m.winner?.teamName;
              const row = (team, score) => (
                <div
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${
                    winnerName && winnerName === team
                      ? "font-semibold text-green-700"
                      : ""
                  }`}
                >
                  <span className="truncate">{team ?? "TBD"}</span>
                  <span>{score ?? "–"}</span>
                </div>
              );
              return (
                <div
                  key={m._id}
                  className={`divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white ${
                    m.status === "cancelled" ? "opacity-50" : ""
                  }`}
                >
                  {row(m.teamA, m.scoreA)}
                  {row(m.teamB, m.scoreB)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */

export default function EventSchedule() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]); // accepted registrations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("matches");
  const [modal, setModal] = useState(null); // null | { match?: object }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const [evRes, matchRes, teamRes] = await Promise.allSettled([
      api.get(`/events/${eventId}`),
      api.get(`/events/${eventId}/matches`),
      api.get(`/events/${eventId}/registrations`, {
        params: { status: "accepted" },
      }),
    ]);

    if (evRes.status === "rejected") {
      setError(errorMessage(evRes.reason));
    } else if (matchRes.status === "rejected") {
      setEvent(evRes.value.data?.data ?? null);
      setError(errorMessage(matchRes.reason));
    } else {
      setError("");
      setEvent(evRes.value.data?.data ?? null);
      setMatches(matchRes.value.data ?? []);
    }
    // Teams are only needed for the dropdowns and the team count.
    setTeams(teamRes.status === "fulfilled" ? (teamRes.value.data ?? []) : []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    // Initial data fetch intentionally triggers `load()`, which resolves
    // asynchronously and updates component state once the request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const nextNumber = useMemo(
    () => Math.max(0, ...matches.map((m) => m.matchNumber ?? 0)) + 1,
    [matches],
  );

  async function cancelMatch(m) {
    if (
      !window.confirm(
        `Cancel "${matchTitle(m)}"? It will be marked as cancelled and can't be edited afterwards.`,
      )
    ) {
      return;
    }
    setBusyId(m._id);
    setError("");
    try {
      await api.patch(`/matches/${m._id}/cancel`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <Link
            to="/admin/schedule"
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-[#0038a8]"
          >
            ⬅ Back to Schedule Manager
          </Link>

          {loading && (
            <p className="py-10 text-center text-gray-500">Loading...</p>
          )}

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-700"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {event && (
            <>
              <div className="mt-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {event.title}
                  </h1>
                  <p className="mt-1 text-gray-500">
                    {[
                      event.game,
                      event.type,
                      `${teams.length} ${teams.length === 1 ? "team" : "teams"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({})}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  ＋ Add Match
                </button>
              </div>

              {event.isSchedulePublished ? (
                <div
                  className="mt-6 flex items-center gap-2 rounded-lg  border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
                  style={{ fontWeight: "bold" }}
                >
                  <Check />
                  Schedule is published and visible to the public.
                </div>
              ) : (
                <div
                  className="mt-6 rounded-lg  px-4 py-3 text-sm text-black-800"
                  style={{ fontWeight: "bold" }}
                >
                  Schedule is not published yet.
                </div>
              )}

              <div
                role="tablist"
                className="mt-6 inline-flex rounded-lg bg-gray-200/70 p-1"
              >
                {[
                  ["matches", "Matches"],
                  ["bracket", "Bracket"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      tab === id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {tab === "bracket" ? (
                  <Bracket matches={matches} />
                ) : matches.length === 0 ? (
                  <p className="py-10 text-center text-gray-500">
                    No matches yet. Click Add Match to schedule the first one.
                  </p>
                ) : (
                  <ul className="grid gap-3">
                    {matches.map((m) => {
                      const cancelled = m.status === "cancelled";
                      const completed = m.status === "completed";
                      const when = [
                        dateOnly(m.scheduledDate),
                        m.startTime && `at ${m.startTime}`,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <li
                          key={m._id}
                          className={`flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 ${
                            cancelled ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#0038a8]">
                              M{m.matchNumber ?? "–"}
                            </div>
                            <div className="min-w-0">
                              <h2 className="truncate text-[15px] font-semibold">
                                {matchTitle(m)}
                              </h2>
                              <p className="text-sm text-gray-500">
                                {[m.round, m.stage, when]
                                  .filter(Boolean)
                                  .join(" · ") || "No schedule yet"}
                              </p>
                              {m.winner?.teamName && (
                                <p className="text-sm text-green-600">
                                  Winner: {m.winner.teamName}
                                </p>
                              )}
                              {m.scoreA != null && m.scoreB != null && (
                                <p className="text-sm text-gray-500">
                                  Score: {m.scoreA} - {m.scoreB}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                STATUS_BADGE[m.status] ?? STATUS_BADGE.scheduled
                              }`}
                            >
                              {STATUS_LABELS[m.status] ?? m.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setModal({ match: m })}
                              disabled={cancelled}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelMatch(m)}
                              disabled={
                                completed || cancelled || busyId === m._id
                              }
                              aria-label={`Cancel ${matchTitle(m)}`}
                              title={
                                completed
                                  ? "A completed match cannot be cancelled"
                                  : cancelled
                                    ? "Already cancelled"
                                    : "Cancel match"
                              }
                              className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {modal && (
        <MatchModal
          eventId={eventId}
          match={modal.match}
          teams={teams}
          nextNumber={nextNumber}
          onClose={() => setModal(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
