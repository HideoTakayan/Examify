import { Request } from "express";
import type { TokenPayload } from "~/services/authToken.service";

/** Các endpoint vẫn cho phép khi tài khoản chưa đổi mật khẩu lần đầu. */
export function isPasswordChangeExempt(req: Request, userId: string): boolean {
  const url = (req.originalUrl || "").split("?")[0].toLowerCase();
  const method = req.method.toUpperCase();

  if (method === "GET" && url.endsWith("/auth/session")) return true;
  if (method === "POST" && url.endsWith("/auth/logout")) return true;

  const m = url.match(/\/users\/([^/]+)\/password$/);
  if (method === "PATCH" && m && m[1] === userId.toLowerCase()) return true;

  return false;
}

export function mustChangePassword(payload: TokenPayload): boolean {
  return Boolean(payload.first_login) && payload.role !== "admin";
}
