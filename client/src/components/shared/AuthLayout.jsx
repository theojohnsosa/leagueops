import { Link } from "react-router-dom";
import Button from "./Button";
import logoHeader from "../../assets/logo-header.png";
import logoCard from "../../assets/logo-card.png";
import "./shared.css";

export default function AuthLayout({ title, subtitle, cardWidth, children }) {
  return (
    <>
      <header className="auth-header">
        <Link to="/">
          <img src={logoHeader} alt="LeagueOps" className="auth-header__logo" />
        </Link>
        <nav className="auth-header__nav">
          <Button to="/login" variant="outline">
            Sign In
          </Button>
          <Button to="/signup" variant="blue">
            Sign Up
          </Button>
        </nav>
      </header>

      <main className="auth-page">
        <section
          className="auth-card"
          style={cardWidth ? { "--card-width": cardWidth } : undefined}
        >
          <img src={logoCard} alt="" className="auth-card__logo" />
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__subtitle">{subtitle}</p>
          {children}
        </section>
      </main>
    </>
  );
}
