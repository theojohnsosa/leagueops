import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import "./App.css";
import leagueopsLogo from "./assets/NUHO TOURNAMENT HUB LOGO DRAFTS 1.png";
import api from "./services/api.js";

import EventLogs from "./pages/admin/EventLogs.jsx";
import AuditLogs from "./pages/admin/AuditLogs.jsx";
import Registrations from "./pages/admin/registrations.jsx";
import Schedule from "./pages/admin/schedule.jsx";
import EventSchedule from "./pages/admin/eventSchedule.jsx";
import ManageEvents from "./pages/admin/Manageevents.jsx";
import Users from "./pages/admin/Users.jsx";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Manage Events", "/manage-events"],
  ["Registrations", "/registrations"],
  ["Schedule Mgr", "/schedule-manager"],
  ["Archive", "/archive"],
  ["Event Logs", "/event-logs"],
  ["Audit Logs", "/audit-logs"],
  ["Users", "/users"],
  ["Announcements", "/announcements"],
];

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/dashboard/stats", {
          signal: controller.signal,
        });

        setDashboardData(data);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(
            requestError.response?.data?.message ||
              "Unable to load dashboard data.",
          );
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
      icon: "🏆",
      color: "blue",
    },
    {
      label: "Total Registrations",
      value: dashboardData?.stats?.totalRegistrations ?? 0,
      icon: "👥",
      color: "red",
    },
    {
      label: "Active Events",
      value: dashboardData?.stats?.activeEvents ?? 0,
      icon: "🎯",
      color: "yellow",
    },
    {
      label: "Pending Approvals",
      value: dashboardData?.stats?.pendingApprovals ?? 0,
      icon: "📋",
      color: "slate",
    },
  ];

  const matches = dashboardData?.upcomingMatches ?? [];
  const activities = dashboardData?.recentActivity ?? [];
  const eventSummaries = dashboardData?.eventSummaries ?? [];
  const chartColors = ["blue", "red", "yellow", "blue", "red", "yellow"];

  const registrationCount = (event) => event.registration?.total ?? 0;

  const maxRegistrations = Math.max(
    1,
    ...eventSummaries.map(registrationCount),
  );

  const chartMax = Math.max(3, Math.ceil(maxRegistrations / 3) * 3);

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <h1>Dashboard</h1>
        <p>Overview of events, registrations, and matches.</p>
      </div>

      {error && (
        <div className="archive-notice" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      <section className="dashboard-stats" aria-label="Dashboard summary">
        {stats.map((stat) => (
          <article className="dashboard-stat-card" key={stat.label}>
            <span className={`stat-icon ${stat.color}`}>{stat.icon}</span>
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
            {eventSummaries.map((event) => (
              <div className="dashboard-slot-row" key={event.eventId}>
                <span>{event.title}</span>
                <strong>
                  {event.slots?.unlimited
                    ? `${event.slots?.occupied ?? 0} accepted`
                    : `${event.slots?.remaining ?? 0} slots remaining`}
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
                .filter((value, index, array) => array.indexOf(value) === index)
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
                  <div className="chart-bar-column" key={event.eventId}>
                    <div className="chart-bar-area">
                      <div
                        className={`chart-bar ${chartColors[index % chartColors.length]}`}
                        style={{ height: `${(count / chartMax) * 100}%` }}
                        title={`${event.title}: ${count} registrations`}
                      />
                    </div>
                    <span title={event.title}>{event.title}</span>
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
              <article className="dashboard-match" key={match._id || index}>
                <div>
                  <strong>
                    {match.teamA || "TBA"} vs {match.teamB || "TBA"}
                  </strong>
                  <p>
                    {match.eventId?.title || "Event TBA"}
                    {" · "}
                    {match.stage || match.round || "Match"}
                  </p>
                </div>

                <div className="dashboard-match-date">
                  <strong>{formatDate(match.scheduledDate)}</strong>
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
          <span className="activity-mark" /> Recent Event Activity
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
                    {activity.action || activity.type || "Event update"}
                  </strong>
                  <p>
                    {activity.eventTitle ||
                      activity.description ||
                      activity.message ||
                      "A recent event activity was recorded."}
                  </p>
                </div>

                <time>{formatDate(activity.createdAt)}</time>
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

export default function ArchiveDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [events, setEvents] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("All Games");
  const [type, setType] = useState("All Types");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewing, setViewing] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (location.pathname !== "/archive") return undefined;

    const controller = new AbortController();

    async function loadArchivedEvents() {
      setLoadingArchive(true);
      setNotice("");

      try {
        const { data } = await api.get("/archive/events", {
          signal: controller.signal,
        });

        const archivedEvents = Array.isArray(data) ? data : [];

        setEvents(
          archivedEvents.map((event) => {
            const archivedDate = event.archivedAt
              ? new Date(event.archivedAt)
              : null;

            return {
              ...event,
              id: event._id,
              title: event.title || event.name || "Untitled event",
              archivedAt:
                archivedDate && !Number.isNaN(archivedDate.getTime())
                  ? archivedDate.toISOString().slice(0, 10)
                  : "",
              game: event.game || "Unknown game",
              type: event.type || event.eventType || "Event",
              archiveStatus: event.archiveStatus || "archived",
              description: event.description || "",
              canRestore:
                event.archiveStatus === "archived" && event.canRestore === true,
            };
          }),
        );
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setNotice(
            requestError.response?.data?.message ||
              "Unable to load archived events.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingArchive(false);
        }
      }
    }

    loadArchivedEvents();

    return () => controller.abort();
  }, [location.pathname]);

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
    [events, search, game, type, from, to],
  );

  function resetFilters() {
    setSearch("");
    setGame("All Games");
    setType("All Types");
    setFrom("");
    setTo("");
  }

  async function restoreEvent(id) {
    const event = events.find((item) => item._id === id || item.id === id);

    if (!event) return;

    if (!event.canRestore) {
      setNotice("This event's 7-day restore window has expired.");
      return;
    }

    if (!window.confirm(`Restore "${event.title}"?`)) return;

    try {
      const { data } = await api.patch(`/events/${id}/restore`);

      setEvents((current) =>
        current.filter((item) => item._id !== id && item.id !== id),
      );

      setViewing(null);
      setNotice(data.message || "Event restored successfully.");
    } catch (requestError) {
      if (requestError.response?.status === 410) {
        setEvents((current) =>
          current.map((item) =>
            item._id === id || item.id === id
              ? {
                  ...item,
                  canRestore: false,
                  archiveStatus: "expired",
                }
              : item,
          ),
        );

        setViewing((current) =>
          current && (current._id === id || current.id === id)
            ? {
                ...current,
                canRestore: false,
                archiveStatus: "expired",
              }
            : current,
        );
      }

      setNotice(
        requestError.response?.data?.message ||
          "Failed to restore event. Please try again.",
      );
    }
  }

  const isArchivePage = location.pathname === "/archive";

  return (
    <div className="archive-app">
      <header className="league-navbar">
        <a
          className="league-brand"
          href="#top"
          aria-label="LeagueOps home"
          onClick={(event) => {
            event.preventDefault();
            navigate("/dashboard");
          }}
        >
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
      ) : location.pathname === "/manage-events" ? (
        <ManageEvents />
      ) : location.pathname === "/users" ? (
        <Users />
      ) : isArchivePage ? (
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
              <span className="search-symbol" aria-hidden="true">
                ⌕
              </span>
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
              <option>MLBB</option>
              <option>Tekken 8</option>
              <option>League of Legends</option>
            </select>

            <select
              aria-label="Filter by event type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option>All Types</option>
              <option>tournament</option>
              <option>tryout</option>
              <option>campus_event</option>
              <option>Tournament</option>
              <option>Scrimmage</option>
              <option>Tryout</option>
              <option>Competition</option>
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

            <button
              type="button"
              className="action-button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </section>

          {loadingArchive && <p>Loading archived events...</p>}

          {!loadingArchive && filteredEvents.length > 0 ? (
            <section className="archive-list" aria-label="Archived events">
              {filteredEvents.map((event) => (
                <article className="archive-row" key={event._id || event.id}>
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
                        {event.archiveStatus}
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
                      View
                    </button>

                    <button
                      type="button"
                      className="action-button restore-button"
                      disabled={!event.canRestore}
                      onClick={() => restoreEvent(event._id || event.id)}
                    >
                      Restore
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            !loadingArchive && (
              <section className="archive-empty">
                <p>No archived events found.</p>
              </section>
            )
          )}
        </main>
      ) : location.pathname === "/event-logs" ? (
        <EventLogs />
      ) : location.pathname === "/audit-logs" ? (
        <AuditLogs />
      ) : location.pathname === "/registrations" ? (
        <Registrations />
      ) : location.pathname === "/schedule-manager" ? (
        <Schedule />
      ) : location.pathname.startsWith("/schedule-manager/") ? (
        <EventSchedule />
      ) : (
        <main className="archive-main">
          <div className="archive-heading">
            <h1>
              {navItems.find(([, path]) => path === location.pathname)?.[0] ||
                "Page Not Found"}
            </h1>
            <p>This page is coming soon.</p>
          </div>
        </main>
      )}

      {isArchivePage && viewing && (
        <div
          className="archive-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
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
              onClick={() => setViewing(null)}
            >
              ×
            </button>

            <h2 id="archive-modal-title">{viewing.title}</h2>
            <p className="modal-description">
              {viewing.description || "No description provided."}
            </p>

            <dl className="archive-details">
              <div>
                <dt>Game</dt>
                <dd>{viewing.game}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{viewing.type}</dd>
              </div>
              <div>
                <dt>Archive status</dt>
                <dd>{viewing.archiveStatus || "archived"}</dd>
              </div>
              <div>
                <dt>Archived</dt>
                <dd>{formatDate(viewing.archivedAt)}</dd>
              </div>
              <div>
                <dt>Restore deadline</dt>
                <dd>{formatDate(viewing.restoreDeadline)}</dd>
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
                className="action-button restore-button"
                disabled={!viewing.canRestore}
                onClick={() => restoreEvent(viewing._id || viewing.id)}
              >
                Restore
              </button>
            </div>
          </section>
        </div>
      )}
  </div>
  );
}