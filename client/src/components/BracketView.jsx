import { useMemo } from "react";

const STATUS_BADGE = {
  scheduled: {
    label: "Upcoming",
    className: "border border-gray-200 bg-gray-100 text-gray-700",
  },
  ongoing: { label: "Live", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", className: "bg-slate-800 text-white" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

// Groups matches into rounds, in bracket order (by the lowest match number).
function groupRounds(matches) {
  const map = new Map();
  for (const m of matches) {
    const name = m.round?.trim() || "Matches";
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(m);
  }
  const num = (m) => m.matchNumber ?? Number.MAX_SAFE_INTEGER;
  return [...map]
    .map(([name, list]) => ({
      name,
      matches: [...list].sort((a, b) => num(a) - num(b)),
    }))
    .sort((a, b) => num(a.matches[0]) - num(b.matches[0]));
}

function TeamRow({ name, isWinner }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[13px] ${
        isWinner ? "bg-green-50 font-bold text-gray-900" : "text-gray-800"
      }`}
    >
      <span className="truncate">{name ?? "TBD"}</span>
      {isWinner && (
        <span aria-label="Winner" className="text-sm text-green-600">
          ✓
        </span>
      )}
    </div>
  );
}

function MatchCard({ match: m }) {
  const badge = STATUS_BADGE[m.status] ?? STATUS_BADGE.scheduled;
  const hasScore = m.scoreA != null && m.scoreB != null;
  const done = m.status === "completed";

  // Prefer the winner the server saved; fall back to the higher score.
  const winnerName =
    m.winner?.teamName ??
    (done && hasScore && m.scoreA !== m.scoreB
      ? m.scoreA > m.scoreB
        ? m.teamA
        : m.teamB
      : null);

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-3 ${
        m.status === "cancelled" ? "opacity-50" : ""
      }`}
    >
      <p className="mb-2 text-center text-[11px] text-gray-500">
        Match {m.matchNumber ?? "–"}
      </p>
      <div className="grid gap-1.5">
        <TeamRow
          name={m.teamA}
          isWinner={Boolean(winnerName) && winnerName === m.teamA}
        />
        <TeamRow
          name={m.teamB}
          isWinner={Boolean(winnerName) && winnerName === m.teamB}
        />
      </div>
      {hasScore && (
        <p className="mt-2 text-center text-xs text-gray-500">
          {m.scoreA} - {m.scoreB}
        </p>
      )}
      <div className="mt-1.5 flex justify-center">
        <span
          className={`rounded-full px-3 py-0.5 text-[11px] font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}

export default function BracketView({
  matches,
  emptyText = "No matches have been scheduled for this event yet.",
}) {
  const rounds = useMemo(() => groupRounds(matches ?? []), [matches]);

  if (rounds.length === 0) {
    return <p className="py-10 text-center text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="mt-6 flex items-start gap-5 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <section key={round.name} className="w-52 shrink-0">
          <h2 className="mb-5 text-center text-[13px] font-semibold uppercase tracking-wider text-gray-500">
            {round.name}
          </h2>
          <div className="grid gap-4">
            {round.matches.map((m) => (
              <MatchCard key={m._id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}