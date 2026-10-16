import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "leagueops_token";
const AUTH_COOKIE_DAYS = 7;

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function signAuthToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: `${AUTH_COOKIE_DAYS}d`,
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function setAuthCookie(res, userId) {
  res.cookie(COOKIE_NAME, signAuthToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
