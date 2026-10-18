import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/shared/AuthLayout";
import Input from "../components/shared/Input";
import Button from "../components/shared/Button";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../services/api.js";
import "../styles/auth.css";

function getErrorMessage(error) {
  if (!error.response) {
    return "Cannot reach the server. Check that the backend is running.";
  }

  const data = error.response.data;
  const details = data?.errors ? Object.values(data.errors).join(" ") : "";

  return [data?.message || "Unable to sign in.", details]
    .filter(Boolean)
    .join(" ");
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    studentEmail: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const destination = location.state?.from?.pathname || "/dashboard";

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.studentEmail.trim()) {
      nextErrors.studentEmail = "Enter your student email.";
    }

    if (!form.password) {
      nextErrors.password = "Enter your password.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSubmitError("");

    try {
      await login(form.studentEmail.trim(), form.password);
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleMockLogin() {
    setLoading(true);
    setSubmitError("");

    try {
      await login("", "");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Pick up where your competition begins."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Student Email"
          name="studentEmail"
          type="email"
          autoComplete="username"
          placeholder="Enter your student email..."
          value={form.studentEmail}
          onChange={handleChange}
          error={errors.studentEmail}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password..."
          value={form.password}
          onChange={handleChange}
          error={errors.password}
        />

        <Link to="/forgot-password" className="auth-form__link">
          Forgot password?
        </Link>

        {submitError && (
          <p className="auth-form__error" role="alert">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          block
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        {USE_MOCK && (
          <Button
            type="button"
            block
            disabled={loading}
            onClick={handleMockLogin}
          >
            Mock login (development only)
          </Button>
        )}

        <p>
          Don't have an account? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
