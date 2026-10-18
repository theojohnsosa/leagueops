import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api.js";
import "./auth.css";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("The verification link is invalid.");
        return;
      }

      try {
        const { data } = await api.post(
          "/auth/verify-email",
          { token },
          { signal: controller.signal },
        );

        if (cancelled) return;

        setStatus("success");
        setMessage(
          data.message || "Your email address has been verified successfully.",
        );
      } catch (error) {
        if (cancelled || error.code === "ERR_CANCELED") return;

        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "Verification failed. Please check your connection and try again.",
        );
      }
    }

    verify();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">LeagueOps</div>
        <p className="auth-eyebrow">EMAIL VERIFICATION</p>

        <h1>
          {status === "loading"
            ? "Verifying Email"
            : status === "success"
              ? "Email Verified"
              : "Verification Failed"}
        </h1>

        <p
          className={
            status === "success"
              ? "auth-success"
              : status === "error"
                ? "auth-error"
                : "auth-description"
          }
          role="status"
          aria-live="polite"
        >
          {message}
        </p>

        {status !== "loading" && (
          <Link className="auth-button" to="/login">
            Go to Login
          </Link>
        )}
      </section>
    </main>
  );
}
