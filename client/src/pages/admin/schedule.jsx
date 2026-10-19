import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errorMessage } from "../../lib/api.js";

// A badge shows the event's lifecycle only for these statuses.
const STATUS_BADGES = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  completed: { label: "Completed", className: "bg-slate-700 text-white" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

const PUBLISHED_BADGE = "bg-blue-100 text-blue-700";

// Registration is open only between the open and closed dates
// (a missing date means no limit on that side) and never for finished events.
function registrationIsOpen(event, now = new Date()) {
  if (["completed", "cancelled"].includes(event.status)) return false;
  const opens = event.registrationOpenDate
    ? new Date(event.registrationOpenDate)
    : null;
  const closes = event.registrationClosedDate
    ? new Date(event.registrationClosedDate)
    : null;
  if (opens && now < opens) return false;
  if (closes && now > closes) return false;
  return true;
}

function Badge({ className, title, children }) {
  return (
    <span
      title={title}
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export default function ScheduleManager() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [teamCounts, setTeamCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        // Events are required. Team counts are a bonus, so a failure there
        // should not break the page.
        const [eventsRes, statsRes] = await Promise.allSettled([
          api.get("/events"),
          api.get("/dashboard/stats"),
        ]);

        if (ignore) return;

        if (eventsRes.status === "rejected") {
          setError(errorMessage(eventsRes.reason));
          return;
        }
        setEvents(eventsRes.value.data?.data ?? []);

        if (statsRes.status === "fulfilled") {
          const counts = {};
          for (const s of statsRes.value.data?.eventSummaries ?? []) {
            counts[String(s.eventId)] = s.registration?.accepted ?? 0;
          }
          setTeamCounts(counts);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        regOpen: registrationIsOpen(e),
        teams: teamCounts[String(e._id)],
      })),
    [events, teamCounts],
  );

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <h1 className="text-3xl font-bold">Schedule Manager</h1>
          <p className="mt-1 text-gray-500">
            Select an event to manage its schedule and bracket.
          </p>

          {loading && (
            <p className="py-10 text-center text-gray-500">Loading events...</p>
          )}

          {!loading && !error && rows.length === 0 && (
            <p className="py-10 text-center text-gray-500">
              No events yet. Create one in Manage Events and it will show up
              here.
            </p>
          )}

          <ul className="mt-6 grid gap-3">
            {rows.map((e) => {
              const statusBadge = STATUS_BADGES[e.status];
              return (
                <li key={e._id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/schedule-manager/${e._id}`)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:border-[#0038a8]/40 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0038a8]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold">
                          {e.title}
                        </h2>
                        {statusBadge && (
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        )}
                        {e.isSchedulePublished && (
                          <Badge
                            className={PUBLISHED_BADGE}
                            title="Schedule is published"
                          >
                            Published
                          </Badge>
                        )}
                        {e.isBracketPublished && (
                          <Badge
                            className={PUBLISHED_BADGE}
                            title="Bracket is published"
                          >
                            Published
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {[
                          e.game,
                          e.teams === undefined
                            ? null
                            : `${e.teams} ${e.teams === 1 ? "team" : "teams"}`,
                          `Reg: ${e.regOpen ? "Open" : "Closed"}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="h-4 w-4 shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 4l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </>
  );
}
