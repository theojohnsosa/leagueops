import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Events from "./pages/Events.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Registrations from "./pages/Registrations.jsx";
import Matches from "./pages/Matches.jsx";
import Announcements from "./pages/Announcements.jsx";
import Users from "./pages/Users.jsx";
import Approvals from "./pages/Approvals.jsx";
import Archive from "./pages/Archive.jsx";
import Logs from "./pages/Logs.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/registrations" element={<Registrations />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/announcements" element={<Announcements />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/users" element={<Users />} />
        <Route path="/logs" element={<Logs />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin", "head"]} />}>
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/archive" element={<Archive />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import leagueopsLogo from "./assets/NUHO TOURNAMENT HUB LOGO DRAFTS 1.png";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Manage Events", "/manage-events"],
  ["Registrations", "/registrations"],
  ["Schedule Mgr", "/schedule-manager"],
  ["Archive", "/archive"],
  ["Users", "/users"],
  ["Announcements", "/announcements"],
];



const initialEvents = [
  {
    id: 1,
    title: "CODM Fall Showdown",
    game: "CODM",
    type: "Tournament",
    archivedAt: "2026-09-22",
    status: "Published",
    description: "CODM Fall Showdown tournament event.",
  },
];

const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};


const dashboardEvents = [
  { title: "MLBB Hydroid Open Cup", slots: "8/8 slots" },
  { title: "Tekken 8 Individual Ladder", slots: "16/16 slots" },
  {
    title: "MLBB Inter-Department Tournament Season 1",
    slots: "2/10 slots",
  },
  { title: "Tekken 8 Campus Tryouts", slots: "20/32 slots" },
];

const dashboardMatches = [
  {
    teams: "Juan Santos vs Maria Reyes",
    event: "Tekken 8 Campus Tryouts · Playoffs",
    date: "2026-11-05",
    time: "18:00",
  },
  {
    teams: "Hydra Esports vs MOA Titans",
    event: "MLBB Inter-Department Tournament Season 1 · Playoffs",
    date: "2026-11-30",
    time: "18:00",
  },
];

const dashboardActivity = [
  ["Event archived", "Valorant Rookie Cup · LeagueOps Seed", "10/15/2026"],
  ["Event completed", "Valorant Champions Cup 2026 · LeagueOps Seed", "10/13/2026"],
  ["Event archived", "CODM Scrims Night · LeagueOps Seed", "10/5/2026"],
  ["Schedule published", "Valorant Champions Cup 2026 · LeagueOps Seed", "10/5/2026"],
  ["Approval granted", "MLBB Inter-Department Tournament Season 1 · LeagueOps Seed", "9/27/2026"],
  ["Submitted for approval", "MLBB Inter-Department Tournament Season 1 · LeagueOps Seed", "9/26/2026"],
];



  
function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/dashboard/stats",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load dashboard data.");
        }

        setDashboardData(await response.json());
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();
    return () => controller.abort();
  }, []);

  const stats = [
    {
      label: "Total Events",
      value: dashboardData?.stats?.totalEvents ?? 0,
      icon: "♜",
      color: "blue",
    },
    {
      label: "Total Registrations",
      value: dashboardData?.stats?.totalRegistrations ?? 0,
      icon: "♙",
      color: "red",
    },
    {
      label: "Active Events",
      value: dashboardData?.stats?.activeEvents ?? 0,
      icon: "▦",
      color: "yellow",
    },
    {
      label: "Pending Approvals",
      value: dashboardData?.stats?.pendingApprovals ?? 0,
      icon: "☑",
      color: "slate",
    },
  ];

  const matches = dashboardData?.upcomingMatches ?? [];
  const activities = dashboardData?.recentActivity ?? [];
  const eventSummaries = dashboardData?.eventSummaries ?? [];
  const chartColors = ["blue", "red", "yellow", "blue", "red", "yellow"];

  const formatMatchDate = (date) => {
    if (!date) return "Date TBA";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const registrationCount = (event) =>
    event.registration?.total ?? 0;

  const maxRegistrations = Math.max(
    1,
    ...eventSummaries.map(registrationCount)
  );

  const chartMax = Math.max(
    3,
    Math.ceil(maxRegistrations / 3) * 3
  );

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <h1>Dashboard</h1>
        <p>Overview of events, registrations, and matches.</p>
      </div>

      {error && (
        <div className="archive-notice" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      <section
        className="dashboard-stats"
        aria-label="Dashboard summary"
      >
        {stats.map((stat) => (
          <article
            className="dashboard-stat-card"
            key={stat.label}
          >
            <span className={`stat-icon ${stat.color}`}>
              {stat.icon}
            </span>

            <strong>{loading ? "—" : stat.value}</strong>

            <span className="stat-label">{stat.label}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-panel dashboard-open-slots">
        <h2>Slots Remaining (Open Registration)</h2>

        {loading ? (
          <p>Loading event slots...</p>
        ) : eventSummaries.length > 0 ? (
          <div className="dashboard-slots">
            {eventSummaries
              .filter(
                (event) =>
                  event.slots?.unlimited ||
                  (event.slots?.remaining ?? 0) > 0
              )
              .map((event) => (
                <div
                  className="dashboard-slot-row"
                  key={event.eventId}
                >
                  <span>{event.title}</span>

                  <strong>
                    {event.slots?.unlimited
                      ? `${event.slots?.occupied ?? 0} accepted`
                      : `${event.slots?.occupied ?? 0}/${event.slots?.capacity ?? 0} slots`}
                  </strong>
                </div>
              ))}
          </div>
        ) : (
          <p>No open registrations available.</p>
        )}
      </section>

      <section className="dashboard-panel dashboard-registration-chart">
        <h2>Registrations per Event</h2>

        {loading ? (
          <p>Loading registration data...</p>
        ) : eventSummaries.length > 0 ? (
          <div
            className="dashboard-chart"
            role="img"
            aria-label="Bar chart showing registrations per event"
          >
            <div className="chart-y-axis">
              {[
                chartMax,
                Math.round(chartMax * 0.75),
                Math.round(chartMax * 0.5),
                Math.round(chartMax * 0.25),
                0,
              ]
                .filter(
                  (value, index, array) =>
                    array.indexOf(value) === index
                )
                .map((value) => (
                  <span key={value}>{value}</span>
                ))}
            </div>

            <div className="chart-content">
              {[0, 25, 50, 75, 100].map((position) => (
                <span
                  className="chart-gridline"
                  style={{ bottom: `${position}%` }}
                  key={position}
                />
              ))}

              {eventSummaries.map((event, index) => {
                const count = registrationCount(event);

                return (
                  <div
                    className="chart-bar-column"
                    key={event.eventId}
                  >
                    <div className="chart-bar-area">
                      <div
                        className={`chart-bar ${chartColors[index % chartColors.length]}`}
                        style={{
                          height: `${(count / chartMax) * 100}%`,
                        }}
                        title={`${event.title}: ${count} registrations`}
                      />
                    </div>

                    <span title={event.title}>
                      {event.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p>No registration data available yet.</p>
        )}
      </section>

      <section className="dashboard-panel">
        <h2>Upcoming Matches</h2>

        {loading ? (
          <p>Loading upcoming matches...</p>
        ) : matches.length > 0 ? (
          <div className="dashboard-match-list">
            {matches.map((match, index) => (
              <article
                className="dashboard-match"
                key={match._id || index}
              >
                <div>
                  <strong>
                    {match.teamA || "TBA"} vs{" "}
                    {match.teamB || "TBA"}
                  </strong>

                  <p>
                    {match.eventId?.title || "Event TBA"}
                    {" · "}
                    {match.stage || match.round || "Match"}
                  </p>
                </div>

                <div className="dashboard-match-date">
                  <strong>
                    {formatMatchDate(match.scheduledDate)}
                  </strong>

                  <span>{match.startTime || "Time TBA"}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No upcoming matches scheduled.</p>
        )}
      </section>

      <section className="dashboard-panel dashboard-activity-panel">
        <h2>
          <span className="activity-mark">⌁</span>
          {" "}Recent Event Activity
        </h2>

        {loading ? (
          <p>Loading recent activity...</p>
        ) : activities.length > 0 ? (
          <div className="dashboard-activity-list">
            {activities.map((activity, index) => (
              <article
                className="dashboard-activity"
                key={activity._id || index}
              >
                <div>
                  <strong>
                    {activity.action ||
                      activity.type ||
                      "Event update"}
                  </strong>

                  <p>
                    {activity.eventTitle ||
                      activity.description ||
                      activity.message ||
                      "A recent event activity was recorded."}
                  </p>
                </div>

                <time>
                  {activity.createdAt
                    ? formatMatchDate(activity.createdAt)
                    : "—"}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <p>No recent activity yet.</p>
        )}
      </section>
    </main>
  );
}



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("All Games");
  const [type, setType] = useState("All Types");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const query = search.trim().toLowerCase();

        return (
          `${event.title} ${event.game} ${event.type}`
            .toLowerCase()
            .includes(query) &&
          (game === "All Games" || event.game === game) &&
          (type === "All Types" || event.type === type) &&
          (!from || event.archivedAt >= from) &&
          (!to || event.archivedAt <= to)
        );
      }),
    [events, search, game, type, from, to]
  );

  function resetFilters() {
    setSearch("");
    setGame("All Games");
    setType("All Types");
    setFrom("");
    setTo("");
  }

  function restoreEvent(id) {
    const event = events.find((item) => item.id === id);
    if (!event) return;

    if (!window.confirm(`Restore "${event.title}"?`)) return;

    setEvents((current) =>
      current.filter((item) => item.id !== id)
    );
    setNotice(
      `${event.title} restored in this demo. Refreshing resets sample data.`
    );
  }

  function saveEdit(event) {
    setEvents((current) =>
      current.map((item) => (item.id === event.id ? event : item))
    );
    setEditing(null);
    setNotice("Changes saved in this demo only.");
  }

  return (
    <div className="archive-app">
<header className="league-navbar">
  <a className="league-brand" href="#top" aria-label="LeagueOps home">
    <img src={leagueopsLogo} alt="LeagueOps logo" />
  </a>

  

<nav className="league-links" aria-label="Main navigation">
  {navItems.map(([label, path]) => (
    <a
      key={path}
      href={path}
      className={location.pathname === path ? "nav-active" : ""}
      onClick={(event) => {
        event.preventDefault();
        setViewing(null);
        setEditing(null);
        navigate(path);
      }}
    >
      {label}
    </a>
  ))}
</nav>



  <div className="navbar-user">
    <span className="user-name">Theojohn Sosa</span>
    <span className="admin-badge">Admin</span>
    <button
      className="logout-button"
      type="button"
      onClick={() =>
        setNotice("Logout is not connected in this prototype.")
      }
    >
      ↪ <span>Logout</span>
    </button>
  </div>
</header>


      
{location.pathname === "/dashboard" ? (
  <Dashboard />
) : location.pathname === "/archive" ? (
  <main className="archive-main" id="archive">

        <div className="archive-heading">
          <h1>Archive</h1>
          <p>View and manage archived events.</p>
        </div>

        {notice && (
          <div className="archive-notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        <section
          className="archive-toolbar"
          aria-label="Search and filter archived events"
        >
          <label className="archive-search">
            <span className="search-symbol" aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search archived events..."
            />
          </label>

          <select
            aria-label="Filter by game"
            value={game}
            onChange={(event) => setGame(event.target.value)}
          >
            <option>All Games</option>
            <option>CODM</option>
            <option>Valorant</option>
            <option>Mobile Legends</option>
          </select>

          <select
            aria-label="Filter by event type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>All Types</option>
            <option>Tournament</option>
            <option>Scrimmage</option>
          </select>

          <input
            aria-label="Archived from date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />

          <input
            aria-label="Archived until date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </section>

        {filteredEvents.length > 0 ? (
          <section className="archive-list" aria-label="Archived events">
            {filteredEvents.map((event) => (
              <article className="archive-row" key={event.id}>
                <div className="archive-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M4.5 7.5h15v12h-15z" />
                    <path d="M3.5 4.5h17v3h-17zM9 11h6M9 14h6" />
                  </svg>
                </div>

                <div className="archive-event-info">
                  <div className="archive-title-line">
                    <h2>{event.title}</h2>
                    <span className="published-badge">
                      {event.status}
                    </span>
                  </div>
                  <p>
                    {event.game} · {event.type} · Archived:{" "}
                    {formatDate(event.archivedAt)}
                  </p>
                </div>

                <div className="archive-actions">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => setViewing(event)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                    View
                  </button>

                  <button
                    type="button"
                    className="action-button"
                    onClick={() => setEditing({ ...event })}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m4 16.5-.8 4.3 4.3-.8L19 8.5a2.5 2.5 0 0 0-3.5-3.5Z" />
                      <path d="m13.8 6.7 3.5 3.5" />
                    </svg>
                    Edit
                  </button>

                  <button
                    type="button"
                    className="action-button restore-button"
                    onClick={() => restoreEvent(event.id)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4.5 8V3.8M4.5 8h4.2" />
                      <path d="M5.2 7.8A8 8 0 1 1 4 14" />
                    </svg>
                    Restore
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="archive-empty">
            <p>No archived events found.</p>
            <button type="button" onClick={resetFilters}>
              Clear filters
            </button>
          </section>
        )}
      
  </main>
) : (
  <main className="archive-main">
    <div className="archive-heading">
      <h1>
        {navItems.find(([, path]) => path === location.pathname)?.[0]
          || "Page Not Found"}
      </h1>
      <p>This page is coming soon.</p>
    </div>
  </main>
)}


      {location.pathname === "/archive" && (viewing || editing) && (
        <div
          className="archive-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
              setEditing(null);
            }
          }}
        >
          <section
            className="archive-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-modal-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={() => {
                setViewing(null);
                setEditing(null);
              }}
            >
              ×
            </button>

            {editing ? (
              <>
                <h2 id="archive-modal-title">Edit archived event</h2>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveEdit(editing);
                  }}
                >
                  <label>
                    Event name
                    <input
                      required
                      value={editing.title}
                      onChange={(event) =>
                        setEditing({ ...editing, title: event.target.value })
                      }
                    />
                  </label>

                  <label>
                    Game
                    <select
                      value={editing.game}
                      onChange={(event) =>
                        setEditing({ ...editing, game: event.target.value })
                      }
                    >
                      <option>CODM</option>
                      <option>Valorant</option>
                      <option>Mobile Legends</option>
                    </select>
                  </label>

                  <label>
                    Event type
                    <select
                      value={editing.type}
                      onChange={(event) =>
                        setEditing({ ...editing, type: event.target.value })
                      }
                    >
                      <option>Tournament</option>
                      <option>Scrimmage</option>
                    </select>
                  </label>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="action-button modal-save"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 id="archive-modal-title">{viewing.title}</h2>
                <p className="modal-description">{viewing.description}</p>

                <dl className="archive-details">
                  <div><dt>Game</dt><dd>{viewing.game}</dd></div>
                  <div><dt>Type</dt><dd>{viewing.type}</dd></div>
                  <div><dt>Status</dt><dd>{viewing.status}</dd></div>
                  <div>
                    <dt>Archived</dt>
                    <dd>{formatDate(viewing.archivedAt)}</dd>
                  </div>
                </dl>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => setViewing(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="action-button modal-save"
                    onClick={() => {
                      setEditing({ ...viewing });
                      setViewing(null);
                    }}
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
