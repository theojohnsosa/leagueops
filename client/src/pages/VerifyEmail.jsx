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

    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("The verification link is invalid.");
        return;
      }

      try {
        const { data } = await api.post("/auth/verify-email", { token });

        if (cancelled) return;

        setStatus("success");
        setMessage(
          data.message || "Your email address has been verified successfully.",
        );
      } catch {
        if (cancelled) return;

        // If the request failed, check whether a duplicate request
        // already verified the account before showing an error.
        try {
          await api.post("/auth/verify-email", { token });

          if (cancelled) return;

          setStatus("success");
          setMessage("Email verified successfully. You can now log in.");
        } catch (retryError) {
          if (cancelled) return;

          setStatus("error");
          setMessage(
            retryError.response?.data?.message ||
              "Verification failed. The link may have expired or already been used.",
          );
        }
      }
    }

    verify();

    return () => {
      cancelled = true;
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
