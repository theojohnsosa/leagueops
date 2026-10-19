import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/shared/Navbar.jsx";
import "./Events.css";

// MOCK DATA: papalitan ng API call kapag may endpoint na
const MOCK_EVENTS = [
  {
    id: "1",
    game: "Tekken 8",
    title: "Tekken 8 Individual Ladder",
    description:
      "Individual ladder tryout to select the varsity Tekken 8 roster.",
    status: "Open",
    slotsTaken: 0,
    slotsTotal: 16,
    daysLeft: 15,
    type: "Individual",
  },
  {
    id: "2",
    game: "MLBB",
    title: "MLBB Inter-Department Tournament Season 1",
    description:
      "The flagship MLBB tournament for NU MOA students. Gather your team and compete for glory!",
    status: "Open",
    slotsTaken: 8,
    slotsTotal: 10,
    daysLeft: 15,
    type: "Team",
  },
  {
    id: "3",
    game: "Tekken 8",
    title: "Tekken 8 Campus Tryouts",
    description:
      "Show your skills in Tekken 8 and represent NU MOA in inter-campus competitions!",
    status: "Open",
    slotsTaken: 12,
    slotsTotal: 32,
    daysLeft: 15,
    type: "Individual",
  },
  {
    id: "4",
    game: "CODM",
    title: "CODM Tourna",
    description: "Sample Test",
    status: "Closed",
    slotsTaken: 0,
    slotsTotal: 10,
    daysLeft: 0,
    type: "Team",
  },
  {
    id: "5",
    game: "CODM",
    title: "CODM Fall Showdown",
    description: "A Call of Duty Mobile tournament that has been archived.",
    status: "Closed",
    slotsTaken: 4,
    slotsTotal: 8,
    daysLeft: 0,
    type: "Team",
  },
];

export default function Events() {
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("All Games");
  const [type, setType] = useState("All Types");

  const events = MOCK_EVENTS;

  const games = useMemo(
    () => ["All Games", ...new Set(events.map((e) => e.game))],
    [events],
  );
  const types = useMemo(
    () => ["All Types", ...new Set(events.map((e) => e.type))],
    [events],
  );

  const filtered = events.filter((e) => {
    const q = search.trim().toLowerCase();
    return (
      (!q ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)) &&
      (game === "All Games" || e.game === game) &&
      (type === "All Types" || e.type === type)
    );
  });

  return (
    <>
      <Navbar variant="blue" />
      <main className="ev">
        <h1>Events</h1>
        <p className="ev-sub">
          Browse and register for upcoming esports events.
        </p>

        <div className="ev-filters">
          <input
            type="search"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={game} onChange={(e) => setGame(e.target.value)}>
            {games.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="ev-empty">No events found.</p>
        ) : (
          <div className="ev-grid">
            {filtered.map((e) => (
              <Link to={`/events/${e.id}`} className="ev-card" key={e.id}>
                <div className="ev-card-top">
                  <span className="ev-game">{e.game}</span>
                  <span
                    className={`ev-badge ${e.status === "Open" ? "open" : "closed"}`}
                  >
                    {e.status}
                  </span>
                </div>
                <h3>{e.title}</h3>
                <p>{e.description}</p>
                <div className="ev-meta">
                  <span>
                    {e.slotsTaken}/{e.slotsTotal} slots
                  </span>
                  <span>
                    {e.status === "Open" ? `${e.daysLeft} days left` : "Closed"}
                  </span>
                  <span>{e.type}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
