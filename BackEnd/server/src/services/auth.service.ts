import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "~/config/db";
import { env } from "~/config/enviroment";
import {
  createUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  User,
} from "~/models/user.model";
import {
  getActiveSessionByUserId,
  verifySession,
  revokeSessionByTokenHash,
} from "~/models/user_session.model";
import { notifySessionRevoked } from "~/socket/sessionNotify";
import {
  type TokenPayload,
  buildTokenPayload,
  signAccessToken,
  tokenHash,
  issueAuthToken,
  invalidateAllUserTokens,
} from "~/services/authToken.service";

export type { TokenPayload };

export interface LoginResult {
  token: string;
  user: Omit<User, "hashed_password">;
  deviceId: string;
  hasExistingSession: boolean;
}

export const registerUser = async (
  email: string,
  username: string,
  password: string,
  role: User["role"],
  fullName?: string
): Promise<Omit<User, "hashed_password">> => {
  const emailExists = await getUserByEmail(email);
  if (emailExists) throw new Error("Email đã tồn tại");

  const usernameExists = await getUserByUsername(username);
  if (usernameExists) throw new Error("Username đã tồn tại");

  const hashed = await bcrypt.hash(password, 12);
  const user = await createUser(email, username, hashed, role, fullName);

  const { hashed_password, ...publicUser } = user;
  return publicUser;
};

export const loginUser = async (
  email: string,
  password: string,
  deviceId: string,
  deviceInfo?: string
): Promise<LoginResult> => {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Email hoặc mật khẩu không đúng");

  if (!user.is_active) throw new Error("Tài khoản đã bị vô hiệu hóa");

  const valid = await bcrypt.compare(password, user.hashed_password);
  if (!valid) throw new Error("Email hoặc mật khẩu không đúng");

  const existingSession = await getActiveSessionByUserId(user.id);
  const hasExistingSession = !!existingSession;

  const token = await issueAuthToken(user, deviceId, deviceInfo ?? null);
  /** Chỉ đá tab/socket cũ khi thật sự có phiên trước đó — tránh broadcast làm tab vừa login tự kick. */
  if (hasExistingSession) {
    notifySessionRevoked(user.id);
  }

  const { hashed_password, ...publicUser } = user;
  return { token, user: publicUser, deviceId, hasExistingSession };
};

/** Xác thực JWT + session; `first_login` lấy từ claim (không query full user). */
export const verifyTokenPayload = async (token: string): Promise<TokenPayload> => {
  const decoded = jwtVerifyPayload(token);

  const sessionValid = await verifySession(decoded.userId, tokenHash(token));
  if (!sessionValid) {
    throw new Error("Session đã hết hạn hoặc bị thu hồi từ thiết bị khác");
  }

  const account = await pool.query<{ is_active: boolean; token_version: number }>(
    `SELECT is_active, COALESCE(token_version, 0)::int AS token_version
     FROM accounts WHERE id = $1`,
    [decoded.userId]
  );
  const row = account.rows[0];
  if (!row) throw new Error("Người dùng không tồn tại");
  if (!row.is_active) throw new Error("Tài khoản đã bị vô hiệu hóa");
  if (row.token_version !== decoded.tv) {
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  }

  return decoded;
};

function jwtVerifyPayload(token: string): TokenPayload {
  const raw = jwt.verify(token, env.JWT_SECRET) as Partial<TokenPayload>;
  if (
    typeof raw.userId !== "string" ||
    typeof raw.role !== "string" ||
    typeof raw.tv !== "number"
  ) {
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  }
  return {
    userId: raw.userId,
    role: raw.role as User["role"],
    first_login: Boolean(raw.first_login),
    tv: raw.tv,
  };
}

export const logoutUser = async (token: string): Promise<void> => {
  await revokeSessionByTokenHash(tokenHash(token));
};

export interface ChangePasswordResult {
  token: string;
  user: Omit<User, "hashed_password">;
}

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  deviceId: string,
  deviceInfo?: string | null
): Promise<ChangePasswordResult> => {
  const user = await getUserById(userId);
  if (!user) throw new Error("Người dùng không tồn tại");

  const isValid = await bcrypt.compare(currentPassword, user.hashed_password);
  if (!isValid) throw new Error("Mật khẩu hiện tại không đúng");

  if (newPassword.length < 8) {
    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE accounts
     SET hashed_password = $1, first_login = false, updated_at = NOW()
     WHERE id = $2`,
    [hashed, userId]
  );

  await invalidateAllUserTokens(userId);

  const refreshed = await getUserById(userId);
  if (!refreshed) throw new Error("Người dùng không tồn tại");

  const token = await issueAuthToken(
    { ...refreshed, first_login: false },
    deviceId,
    deviceInfo ?? null
  );

  const { hashed_password, ...publicUser } = refreshed;
  return { token, user: { ...publicUser, first_login: false } };
};
