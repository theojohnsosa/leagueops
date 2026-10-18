import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/shared/AuthLayout";
import Input from "../components/shared/Input";
import Button from "../components/shared/Button";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ studentEmail: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
  }

  function validate() {
    const er = {};
    if (!form.studentEmail.trim())
      er.studentEmail = "Enter your student email.";
    if (!form.password) er.password = "Enter your password.";
    return er;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setLoading(true);
    setSubmitError("");
    try {
      await login(form.studentEmail.trim(), form.password);
      navigate("/");
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message ||
          "Login failed. Check your email and password.",
      );
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
          autoComplete="email"
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
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>
    </AuthLayout>
  );
}
