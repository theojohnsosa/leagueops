import { createContext, useContext, useEffect, useState } from "react";
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

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (USE_MOCK) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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
      setUser(null);
    }
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const context = useContext(Ctx);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
