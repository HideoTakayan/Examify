import pool from "~/config/db";
import crypto from "crypto";

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface PasswordResetTokenWithUser extends PasswordResetToken {
  user_email: string;
  user_full_name: string | null;
}

const TOKEN_BYTES = 32;

export const generateResetToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token)
     VALUES ($1, $2)`,
    [userId, token]
  );
  return token;
};

export const findValidToken = async (
  token: string
): Promise<PasswordResetToken | null> => {
  const result = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1 AND used = false AND expires_at > NOW()`,
    [token]
  );
  return (result.rows[0] as PasswordResetToken) ?? null;
};

export const markTokenUsed = async (id: string): Promise<void> => {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used = true, used_at = NOW()
     WHERE id = $1`,
    [id]
  );
};

export const cleanupExpiredTokens = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE used = false AND expires_at < NOW()`
  );
  return result.rowCount ?? 0;
};