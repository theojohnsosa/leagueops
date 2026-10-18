import { useEffect, useState } from "react";
import { Ctx } from "./authContext.js";
import api, { USE_MOCK } from "../services/api.js";

const MOCK = {
  _id: "mock1",
  firstName: "Mock",
  lastName: "Player",
  studentEmail: "mock@students.nu-moa.edu.ph",
  studentId: "2024-000001",
  role: "player",
  isActive: true,
  isEmailVerified: true,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(USE_MOCK ? MOCK : null);
  const [loading, setLoading] = useState(!USE_MOCK);

  useEffect(() => {
    if (USE_MOCK) return;

    let active = true;

    async function checkAuth() {
      try {
        const { data } = await api.get("/auth/me");
        if (active) setUser(data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  async function login(studentEmail, password) {
    if (USE_MOCK) {
      setUser(MOCK);
      return MOCK;
    }

    const { data } = await api.post("/auth/login", {
      studentEmail: studentEmail.trim().toLowerCase(),
      password,
    });

    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      if (!USE_MOCK) {
        await api.post("/auth/logout");
      }
    } finally {
      setUser(USE_MOCK ? MOCK : null);
    }
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
