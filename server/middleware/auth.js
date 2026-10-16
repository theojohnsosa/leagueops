import User from "../models/Users.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAuthToken } from "../utils/tokens.js";

const COOKIE_NAME = "leagueops_token";

function readToken(req) {
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  const authorization = req.headers.authorization;

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return null;
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);

  if (!token) {
    throw new AppError(401, "NOT_LOGGED_IN", "Please log in.");
  }

  let payload;

  try {
    payload = verifyAuthToken(token);
  } catch {
    throw new AppError(401, "NOT_LOGGED_IN", "Please log in.");
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw new AppError(401, "NOT_LOGGED_IN", "Please log in.");
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "ACCOUNT_DEACTIVATED",
      "This account is deactivated.",
    );
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Please confirm your email first.",
    );
  }

  req.user = user;
  next();
});
