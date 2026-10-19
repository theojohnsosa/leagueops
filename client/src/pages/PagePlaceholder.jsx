import { Link } from "react-router-dom";
import "./dashboard.css";

const stats = [
  { label: "Total Events", value: "—", icon: "🏆" },
  { label: "Matches", value: "—", icon: "🎮" },
  { label: "Registrations", value: "—", icon: "👥" },
  { label: "Announcements", value: "—", icon: "📢" },
];

export default function Dashboard() {
  return (
    <div className="lo-dashboard">
      <aside className="lo-sidebar">
        <div className="lo-brand">
          <span className="lo-brand-icon">L</span>
          <div>
            <strong>LeagueOps</strong>
            <small>TOURNAMENT HUB</small>
          </div>
        </div>

        <p className="lo-nav-label">WORKSPACE</p>
        <nav className="lo-nav">
          <Link className="lo-nav-active" to="/dashboard">▦ Dashboard</Link>
          <Link to="/events">🏆 Events</Link>
          <Link to="/bracket">⌘ Bracket</Link>
          <Link to="/matches">🎮 Matches</Link>
          <Link to="/registrations">👥 Registrations</Link>
          <Link to="/announcements">📢 Announcements</Link>
        </nav>

        <div className="lo-sidebar-bottom">
          <span>LEAGUEOPS</span>
          <small>Tournament management made simple.</small>
        </div>
      </aside>

      <main className="lo-main">
        <header className="lo-topbar">
          <div>
            <span className="lo-eyebrow">WORKSPACE / OVERVIEW</span>
            <h1>Dashboard</h1>
          </div>
          <Link className="lo-primary-btn" to="/events">Explore events ↗</Link>
        </header>

        <section className="lo-welcome">
          <div>
            <span className="lo-eyebrow">LEAGUE MANAGEMENT</span>
            <h2>Your tournaments, one place.</h2>
            <p>Track events, matches, and registrations from your workspace.</p>
          </div>
          <div className="lo-welcome-symbol">L<span>O</span></div>
        </section>

        <div className="lo-section-heading">
          <div>
            <h2>Overview</h2>
            <p>Your workspace at a glance</p>
          </div>
          <span className="lo-live"><i /> WORKSPACE READY</span>
        </div>

        <section className="lo-stats">
          {stats.map((stat) => (
            <article className="lo-stat-card" key={stat.label}>
              <div className="lo-stat-top">
                <span>{stat.label}</span>
                <span className="lo-stat-icon">{stat.icon}</span>
              </div>
              <strong>{stat.value}</strong>
              <small>Connect data to view totals</small>
            </article>
          ))}
        </section>

        <section className="lo-lower-grid">
          <article className="lo-panel">
            <div className="lo-panel-heading">
              <div><h2>Quick access</h2><p>Jump into your workspace</p></div>
            </div>
            <Link className="lo-action-row" to="/events">
              <span className="lo-action-icon">🏆</span>
              <span><strong>Browse events</strong><small>Explore tournament events</small></span>
              <b>↗</b>
            </Link>
            <Link className="lo-action-row" to="/bracket">
              <span className="lo-action-icon">⌘</span>
              <span><strong>View bracket</strong><small>Check tournament progression</small></span>
              <b>↗</b>
            </Link>
            <Link className="lo-action-row" to="/matches">
              <span className="lo-action-icon">🎮</span>
              <span><strong>Match center</strong><small>View matches and results</small></span>
              <b>↗</b>
            </Link>
          </article>

          <article className="lo-panel lo-info-panel">
            <span className="lo-info-icon">✳</span>
            <h2>Ready to compete?</h2>
            <p>Explore available events and keep track of your tournament activities.</p>
            <Link className="lo-secondary-btn" to="/events">View events <span>→</span></Link>
          </article>
        </section>

        <footer className="lo-footer">LEAGUEOPS <span>•</span> TOURNAMENT HUB</footer>
      </main>
    </div>
  );
}