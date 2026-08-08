import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { env } from "~/config/enviroment";
import pool from "~/config/db";

import type { User } from "~/models/user.model";

if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}
import {
  replaceUserSession,
  revokeAllSessionsByUserId,
} from "~/models/user_session.model";
import { notifySessionRevoked } from "~/socket/sessionNotify";

const DEFAULT_JWT_EXP = env.JWT_EXPIRES_IN || "24h";

export interface TokenPayload {
  userId: string;
  role: User["role"];
  /** Từ JWT — không đọc DB mỗi request cho cờ này. */
  first_login: boolean;
  /** Khớp accounts.token_version; tăng khi đổi / reset MK. */
  tv: number;
}

function parseExpiryToDate(exp: string): Date {
  const match = exp.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 86400000);
  const [, value, unit] = match;
  const msMap: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + Number(value) * (msMap[unit] || 86400000));
}

export function buildTokenPayload(
  user: Pick<User, "id" | "role" | "first_login" | "token_version">
): TokenPayload {
  return {
    userId: user.id,
    role: user.role,
    first_login: Boolean(user.first_login),
    tv: Number(user.token_version) || 0,
  };
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, {
    expiresIn: DEFAULT_JWT_EXP,
  } as jwt.SignOptions);
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Tăng token_version + thu hồi mọi session (JWT cũ hết hiệu lực). */
export async function invalidateAllUserTokens(userId: string): Promise<number> {
  const r = await pool.query<{ token_version: number }>(
    `UPDATE accounts
     SET token_version = COALESCE(token_version, 0) + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING token_version`,
    [userId]
  );
  await revokeAllSessionsByUserId(userId);
  notifySessionRevoked(userId);
  return r.rows[0]?.token_version ?? 0;
}

export async function persistSessionForToken(
  userId: string,
  deviceId: string,
  token: string,
  deviceInfo: string | null
): Promise<void> {
  const expiresAt = parseExpiryToDate(DEFAULT_JWT_EXP);
  await replaceUserSession(userId, deviceId, tokenHash(token), deviceInfo, expiresAt);
}

/** Phát hành JWT + session mới (sau login hoặc đổi MK). */
export async function issueAuthToken(
  user: User,
  deviceId: string,
  deviceInfo?: string | null
): Promise<string> {
  const payload = buildTokenPayload(user);
  const token = signAccessToken(payload);
  await persistSessionForToken(user.id, deviceId, token, deviceInfo ?? null);
  return token;
}
