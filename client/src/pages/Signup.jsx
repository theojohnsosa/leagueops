import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/shared/AuthLayout";
import Input from "../components/shared/Input";
import Button from "../components/shared/Button";
import api from "../services/api.js";
import "../styles/auth.css";

const initial = {
  firstName: "",
  lastName: "",
  studentEmail: "",
  studentId: "",
  department: "",
  inGameName: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
  }

  function validate() {
    const er = {};
    if (!form.firstName.trim()) er.firstName = "Enter your first name.";
    if (!form.lastName.trim()) er.lastName = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(form.studentEmail))
      er.studentEmail = "Enter a valid student email.";
    if (!form.studentId.trim()) er.studentId = "Enter your student ID.";
    if (!form.department.trim()) er.department = "Enter your department.";
    if (!form.inGameName.trim()) er.inGameName = "Enter your in-game name.";
    if (form.password.length < 8) er.password = "Use at least 8 characters.";
    if (form.confirmPassword !== form.password)
      er.confirmPassword = "Passwords do not match.";
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
      // eslint-disable-next-line no-unused-vars
      const { confirmPassword, ...payload } = form;
      await api.post("/auth/register", payload); // TODO: i-verify ang endpoint sa docs/api/auth.md
      navigate("/login");
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message ||
          "Could not create your account. Try again.",
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
          name="studentEmail"
          type="email"
          autoComplete="email"
          placeholder="Enter your student email..."
          value={form.studentEmail}
          onChange={handleChange}
          error={errors.studentEmail}
        />

        <Input
          label="Student ID"
          name="studentId"
          placeholder="Enter your student id..."
          value={form.studentId}
          onChange={handleChange}
          error={errors.studentId}
        />

        <div className="auth-form__row">
          <Input
            label="Department"
            name="department"
            placeholder="Enter your department..."
            value={form.department}
            onChange={handleChange}
            error={errors.department}
          />
          <Input
            label="In Game Name"
            name="inGameName"
            placeholder="Enter your in game name..."
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
            placeholder="Enter your password..."
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
        <Button
          type="submit"
          block
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create an Account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
