import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api.js";

const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Voided",
};

const STATUS_FILTERS = ["pending", "accepted", "rejected", "cancelled"];

const BADGE = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-600",
};

const fieldClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm";

function playerLabel(p) {
  const name =
    [p.firstName, p.lastName].filter(Boolean).join(" ") ||
    p.inGameName ||
    "Unnamed player";
  return p.studentId ? `${name} (${p.studentId})` : name;
}

// Wraps a CSV cell in quotes. A leading = + - @ is neutralised so Excel
// does not run a team name like "=SUM(1)" as a formula.
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Registrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    eventId: "all",
    game: "all",
    status: "all",
    department: "all",
  });

  // Load everything from the database once.
  useEffect(() => {
    let ignore = false;
    api
      .get("/registrations")
      .then((res) => {
        if (!ignore) setRegistrations(res.data);
      })
      .catch((err) => {
        if (!ignore) setError(errorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Dropdown options come from the data itself.
  const options = useMemo(() => {
    const events = new Map();
    const games = new Set();
    const departments = new Set();
    for (const r of registrations) {
      if (r.eventId?._id) events.set(r.eventId._id, r.eventId.title);
      if (r.eventId?.game) games.add(r.eventId.game);
      if (r.division) departments.add(r.division);
    }
    return {
      events: [...events],
      games: [...games].sort(),
      departments: [...departments].sort(),
    };
  }, [registrations]);

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return registrations.filter((r) => {
      if (filters.eventId !== "all" && r.eventId?._id !== filters.eventId)
        return false;
      if (filters.game !== "all" && r.eventId?.game !== filters.game)
        return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.department !== "all" && r.division !== filters.department)
        return false;
      if (!q) return true;

      const haystack = [
        r.teamName,
        ...(r.playerDetails ?? []).flatMap((p) => [
          p.firstName,
          p.lastName,
          p.inGameName,
          p.studentId,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [registrations, filters]);

  function setFilter(name, value) {
    setFilters((f) => ({ ...f, [name]: value }));
  }

  function exportCsv() {
    const header = [
      "Team",
      "Status",
      "Event",
      "Game",
      "Department",
      "Players",
      "Submitted",
    ];
    const rows = visible.map((r) => [
      r.teamName,
      STATUS_LABELS[r.status] ?? r.status,
      r.eventId?.title ?? "",
      r.eventId?.game ?? "",
      r.division ?? "",
      (r.playerDetails ?? []).map(playerLabel).join("; "),
      r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registrations.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Registrations</h1>
              <p className="mt-1 text-gray-500">
                View all event registrations.
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={visible.length === 0}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <div className="mb-4 mt-6 flex flex-wrap gap-2.5">
            <input
              type="search"
              placeholder="Search teams, players..."
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              className={`${fieldClass} min-w-56 flex-1`}
            />
            <select
              value={filters.eventId}
              onChange={(e) => setFilter("eventId", e.target.value)}
              className={fieldClass}
            >
              <option value="all">All Events</option>
              {options.events.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
            <select
              value={filters.game}
              onChange={(e) => setFilter("game", e.target.value)}
              className={fieldClass}
            >
              <option value="all">All Games</option>
              {options.games.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
              className={fieldClass}
            >
              <option value="all">All Status</option>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={filters.department}
              onChange={(e) => setFilter("department", e.target.value)}
              className={fieldClass}
            >
              <option value="all">All Departments</option>
              {options.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-700"
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

          {loading && (
            <p className="py-10 text-center text-gray-500">
              Loading registrations...
            </p>
          )}

          {!loading && visible.length === 0 && (
            <p className="py-10 text-center text-gray-500">
              {registrations.length === 0
                ? "No registrations yet."
                : "No registrations match your filters."}
            </p>
          )}

          <ul className="grid gap-3">
            {visible.map((r) => (
              <li
                key={r._id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[17px] font-semibold">{r.teamName}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[r.status] ?? BADGE.cancelled}`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                <p className="mb-2.5 mt-1 text-sm text-gray-500">
                  {[
                    r.eventId?.title ?? "Deleted event",
                    r.eventId?.game,
                    r.eventId?.registrationMode || "Team",
                    r.division,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(r.playerDetails ?? []).map((p, i) => (
                    <span
                      key={`${p.studentId}-${i}`}
                      className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs"
                    >
                      {playerLabel(p)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
