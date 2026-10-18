
import { useEffect, useState } from "react";
import api from "../../services/api.js";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function shortenId(value) {
  if (!value) return "—";
  return String(value);
}

export default function EventLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/event-logs", {
          params: {
            page,
            limit: 20,
            ...(action ? { action } : {}),
          },
        });

        if (!active) return;

        setLogs(data.data ?? []);
        setPagination(
          data.pagination ?? {
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        if (!active) return;

        setError(
          err.response?.data?.message ||
            "Unable to load event logs. Please try again.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, [page, action, refreshKey]);

  function handleActionChange(event) {
    setAction(event.target.value);
    setPage(1);
  }

  function refreshLogs() {
    setRefreshKey((key) => key + 1);
  }

  return (
    <main className="logs-page">
      <div className="logs-heading">
        <div>
          <h1>Event Logs</h1>
          <p>
            Monitor recorded actions and changes made to tournament events.
          </p>
        </div>
      </div>

      <section className="logs-summary">
        <div className="logs-summary-card">
          <div className="logs-summary-icon" aria-hidden="true">
            <span>▤</span>
          </div>
          <div>
            <p>Total log records</p>
            <strong>{pagination.total}</strong>
          </div>
        </div>

        <div className="logs-summary-card">
          <div className="logs-summary-icon" aria-hidden="true">
            <span>◷</span>
          </div>
          <div>
            <p>Latest activity</p>
            <strong>
              {logs.length > 0
                ? formatDate(logs[0].createdAt)
                : "No activity"}
            </strong>
          </div>
        </div>
      </section>

      <section className="logs-panel">
        <div className="logs-panel-header">
          <div>
            <h2>Activity history</h2>
            <p>Review event actions and their recorded details.</p>
          </div>
        </div>

        <div className="event-logs-toolbar">
          <label>
            Filter by action
            <select
              value={action}
              onChange={handleActionChange}
              disabled={loading && pagination.total === 0}
            >
              <option value="">All actions</option>
              <option value="EVENT_CREATED">Event created</option>
              <option value="EVENT_UPDATED">Event updated</option>
              <option value="EVENT_COMPLETED">Event completed</option>
              <option value="EVENT_APPROVED">Event approved</option>
              <option value="EVENT_REJECTED">Event rejected</option>
              <option value="EVENT_RESTORED">Event restored</option>
              <option value="EVENT_ARCHIVE_EXPIRED">
                Archive expired
              </option>
            </select>
          </label>

          <span>
            {pagination.total}{" "}
            {pagination.total === 1 ? "record" : "records"}
          </span>

          <button
            type="button"
            onClick={refreshLogs}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="logs-status" role="status">
            Loading event logs...
          </p>
        ) : error ? (
          <div className="logs-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="logs-retry-button"
              onClick={refreshLogs}
            >
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="logs-empty-state">
            <div className="logs-empty-icon" aria-hidden="true">
              <span>▤</span>
            </div>
            <h3>No event logs yet</h3>
            <p>
              Event activity will appear here once actions are recorded.
              Try refreshing after an event has been created or updated.
            </p>
          </div>
        ) : (
          <div className="event-logs-table-wrap">
            <table className="event-logs-table">
              <thead>
                <tr>
                  <th>Date and time</th>
                  <th>Action</th>
                  <th>Performed by</th>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Event ID</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>
                      <span className="event-log-action">
                        {log.action || "UNKNOWN"}
                      </span>
                    </td>
                    <td>{log.actorName || "System"}</td>
                    <td>{log.actorRole || "—"}</td>
                    <td>{log.description || "—"}</td>
                    <td>{shortenId(log.eventId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && pagination.totalPages > 1 && (
          <div className="event-logs-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
