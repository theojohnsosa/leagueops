import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/shared/AuthLayout";
import Input from "../components/shared/Input";
import Button from "../components/shared/Button";
import api from "../services/api.js";
import "../styles/auth.css";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  studentId: "",
  department: "",
  inGameName: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
    const email = form.email.trim().toLowerCase();

    if (!form.firstName.trim()) {
      nextErrors.firstName = "Enter your first name.";
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = "Enter your last name.";
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Enter a valid student email.";
    } else if (!email.endsWith("@students.nu-moa.edu.ph")) {
      nextErrors.email = "Use your @students.nu-moa.edu.ph email address.";
    }

    if (!form.studentId.trim()) {
      nextErrors.studentId = "Enter your student ID.";
    }

    if (!form.department.trim()) {
      nextErrors.department = "Enter your department or program.";
    }

    if (!form.inGameName.trim()) {
      nextErrors.inGameName = "Enter your in-game name.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");
    setSuccess("");

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);

    try {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();

      await api.post("/auth/signup", {
        fullName: `${firstName} ${lastName}`,
        email: form.email.trim().toLowerCase(),
        studentId: form.studentId.trim(),
        department: form.department.trim(),
        inGameName: form.inGameName.trim(),
        password: form.password,
      });

      setSuccess(
        "Account created successfully. Check your email for the verification link.",
      );
      setForm(initialForm);
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create an Account"
      subtitle="Get started with LeagueOps and join the competition."
      cardWidth="440px"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-form__row">
          <Input
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            placeholder="Enter your first name..."
            value={form.firstName}
            onChange={handleChange}
            error={errors.firstName}
          />

          <Input
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Enter your last name..."
            value={form.lastName}
            onChange={handleChange}
            error={errors.lastName}
          />
        </div>

        <Input
          label="Student Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@students.nu-moa.edu.ph"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />

        <Input
          label="Student ID"
          name="studentId"
          placeholder="Enter your student ID..."
          value={form.studentId}
          onChange={handleChange}
          error={errors.studentId}
        />

        <div className="auth-form__row">
          <Input
            label="Department / Program"
            name="department"
            placeholder="Enter your department..."
            value={form.department}
            onChange={handleChange}
            error={errors.department}
          />

          <Input
            label="In-Game Name"
            name="inGameName"
            placeholder="Enter your in-game name..."
            value={form.inGameName}
            onChange={handleChange}
            error={errors.inGameName}
          />
        </div>

        <div className="auth-form__row">
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters..."
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password..."
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />
        </div>

        {submitError && (
          <p className="auth-form__error" role="alert">
            {submitError}
          </p>
        )}

        {success && <p role="status">{success}</p>}

        <Button
          type="submit"
          block
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create an Account"}
        </Button>

        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        {success && (
          <Button type="button" block onClick={() => navigate("/login")}>
            Go to sign in
          </Button>
        )}
      </form>
    </AuthLayout>
  );
}
