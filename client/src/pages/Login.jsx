import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { USE_MOCK } from "../services/api.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleMockLogin() {
    await login();
    navigate("/dashboard");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      <p>The real login form comes in Phase 1.</p>
      {USE_MOCK && (
        <button onClick={handleMockLogin}>Log in as mock user</button>
      )}
    </div>
  );
}
