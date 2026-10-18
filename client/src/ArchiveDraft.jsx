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
