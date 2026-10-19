import { Link, NavLink } from "react-router-dom";
import logoHeader from "../../assets/logo-header.png";
import "./Navbar.css";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Events", to: "/events" },
  { label: "Schedules", to: "/schedules" },
  { label: "Brackets", to: "/brackets" },
  { label: "My Registration", to: "/registrations" },
  { label: "Profile", to: "/profile" },
];

export default function Navbar({ variant = "navy" }) {
  return (
    <nav className={`nb nb-${variant}`}>
      <Link to="/">
        <img src={logoHeader} alt="LeagueOps" className="nb-logo" />
      </Link>

      <ul className="nb-links">
        {NAV_LINKS.map((l) => (
          <li key={l.label}>
            <NavLink
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="nb-actions">
        <Link to="/login" className="nb-btn nb-btn-outline">
          Sign In
        </Link>
        <Link to="/signup" className="nb-btn nb-btn-solid">
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
