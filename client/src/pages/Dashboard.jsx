import { useEffect, useState } from "react";
import api from "../services/api.js";
import "./Dashboard.css";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        setError("");

        const { data } = await api.get("/dashboard/stats", {
          signal: controller.signal,
        });

        setDashboardData(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    const intervalId = setInterval(fetchDashboard, 30000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
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
            
              .map((event) => (
                <div
                  className="dashboard-slot-row"
                  key={event.eventId}
                >
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
          <span className="activity-mark"></span>
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