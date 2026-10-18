import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "leagueops_token";
const AUTH_COOKIE_DAYS = 7;
const AUTH_COOKIE_MAX_AGE = AUTH_COOKIE_DAYS * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return process.env.JWT_SECRET;
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function signAuthToken(userId) {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), {
    expiresIn: `${AUTH_COOKIE_DAYS}d`,
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
}

export function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signAuthToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
