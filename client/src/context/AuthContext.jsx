import { createContext, useContext, useEffect, useState } from "react";
import api, { USE_MOCK } from "../services/api.js";

// Same shape as the user object in docs/api/auth.md
const MOCK_USER = {
  _id: "mock1",
  firstName: "Mock",
  lastName: "Player",
  studentEmail: "mock@students.nu-moa.edu.ph",
  studentId: "2024-000001",
  department: "BSIT",
  inGameName: "Mock",
  role: "player", // change to 'admin' to test admin-only pages
  isActive: true,
  isEmailVerified: true,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app opens, ask the server "am I still logged in?"
  useEffect(() => {
    async function loadUser() {
      if (USE_MOCK) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        setUser(null); // 401 means not logged in, which is fine
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  async function login(studentEmail, password) {
    if (USE_MOCK) {
      setUser(MOCK_USER);
      return MOCK_USER;
    }
    const { data } = await api.post("/auth/login", { studentEmail, password });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    if (!USE_MOCK) await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Any component can call: const { user, login, logout } = useAuth();
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
