import { Link } from "react-router-dom";
import logoHeader from "../../assets/logo-header.png";
import logoHero from "../../assets/logo-hero.png";
import "./Landing.css";
import heroBg from "../../assets/hero-bg.jpg";
import games from "../../assets/games.png";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Schedules", to: "/schedules" },
  { label: "Brackets", to: "/brackets" },
  { label: "My Registration", to: "/my-registration" },
  { label: "Profile", to: "/profile" },
];

const OFFERS = [
  {
    title: "Schedules",
    text: "Stay updated with the latest event schedules, match dates, and game times so you can plan ahead, prepare your team, and never miss an important match.",
    btn: "View Schedules",
    to: "/schedules",
    icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  },
  {
    title: "Event Registration",
    text: "Experience a seamless event registration process that makes it easy to sign up for tournaments, submit your team details, and secure your spot in upcoming esports events.",
    btn: "View Events",
    to: "/events",
    icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  },
  {
    title: "Brackets",
    text: "Follow your tournament journey with clear and organized brackets that display matchups, team progress, and the path to the finals as the competition unfolds.",
    btn: "View Brackets",
    to: "/brackets",
    icon: "M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z",
  },
];

// Pansamantalang text; papalitan ng logo images kapag na-export na

function Marquee() {
  return (
    <div className="lp-marquee" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i}>LEAGUEOPS &nbsp;◎&nbsp; NUHO &nbsp;◎&nbsp;</span>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <nav className="lp-nav">
        <img src={logoHeader} alt="LeagueOps" className="lp-nav-logo" />
        <ul className="lp-nav-links">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <Link to={l.to} className={l.label === "Home" ? "active" : ""}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="lp-nav-actions">
          <Link to="/login" className="lp-btn lp-btn-outline-blue">
            Sign In
          </Link>
          <Link to="/signup" className="lp-btn lp-btn-blue">
            Sign Up
          </Link>
        </div>
      </nav>

      <header
        className="lp-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 11, 31, 0.8), rgba(2, 11, 31, 0.8)), url(${heroBg})`,
        }}
      >
        <div className="lp-hero-text">
          <h1>LEAGUEOPS</h1>
          <p>
            LeagueOps is the home of your campus esports league. Browse upcoming
            events, register in a few clicks, and follow schedules, brackets,
            and results as they happen.
          </p>
          <div className="lp-hero-buttons">
            <Link to="/events" className="lp-btn lp-btn-yellow">
              View Events
            </Link>
            <Link to="/schedules" className="lp-btn lp-btn-outline-yellow">
              Schedules
            </Link>
            <Link to="/brackets" className="lp-btn lp-btn-outline-yellow">
              Brackets
            </Link>
          </div>
        </div>
        <img src={logoHero} alt="LeagueOps logo" className="lp-hero-logo" />
      </header>
      <Marquee />

      <section className="lp-section">
        <h2>WHAT WE OFFER</h2>
        <p className="lp-sub">
          Services that ensure a smooth and hassle-free game registration
          experience.
        </p>
        <div className="lp-cards">
          {OFFERS.map((o) => (
            <div className="lp-card" key={o.title}>
              <div className="lp-card-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={o.icon} />
                </svg>
              </div>
              <h3>{o.title}</h3>
              <p>{o.text}</p>
              <Link to={o.to} className="lp-btn lp-btn-blue lp-btn-full">
                {o.btn}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Marquee />

      <section className="lp-section lp-games-section">
        <h2>GAMES WE PLAY</h2>
        <p className="lp-sub">
          Discover our featured games and compete to become the champion!
        </p>
        <div className="lp-games">
          <img
            src={games}
            alt="Valorant, Call of Duty Mobile, Mobile Legends, Tekken"
          />
        </div>
      </section>
    </div>
  );
}
