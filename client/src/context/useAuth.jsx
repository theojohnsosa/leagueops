import { useContext } from "react";
import { Ctx } from "./authContext.js";

export function useAuth() {
  const context = useContext(Ctx);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
