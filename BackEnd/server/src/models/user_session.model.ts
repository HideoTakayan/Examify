import pool from "~/config/db";

export interface UserSession {
  id: string;
  user_id: string;
  device_id: string;
  device_info: string | null;
  token_hash: string;
  is_active: boolean;
  created_at: Date;
  expires_at: Date;
  last_active_at: Date;
}

export const createUserSession = async (
  userId: string,
  deviceId: string,
  tokenHash: string,
  deviceInfo: string | null,
  expiresAt: Date
): Promise<UserSession> => {
  const result = await pool.query(
    `INSERT INTO user_sessions (user_id, device_id, device_info, token_hash, is_active, expires_at)
     VALUES ($1, $2, $3, $4, true, $5)
     RETURNING *`,
    [userId, deviceId, deviceInfo, tokenHash, expiresAt]
  );
  return result.rows[0];
};

/** Revoke all active sessions then insert one — transactional, single active session per user. */
export const replaceUserSession = async (
  userId: string,
  deviceId: string,
  tokenHash: string,
  deviceInfo: string | null,
  expiresAt: Date
): Promise<UserSession> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    const result = await client.query(
      `INSERT INTO user_sessions (user_id, device_id, device_info, token_hash, is_active, expires_at)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [userId, deviceId, deviceInfo, tokenHash, expiresAt]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getActiveSessionByUserId = async (
  userId: string
): Promise<UserSession | null> => {
  const result = await pool.query(
    `SELECT * FROM user_sessions
     WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
};

export const getActiveSessionsByUserId = async (
  userId: string
): Promise<UserSession[]> => {
  const result = await pool.query(
    `SELECT * FROM user_sessions
     WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const revokeAllSessionsByUserId = async (
  userId: string
): Promise<void> => {
  await pool.query(
    `UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true`,
    [userId]
  );
};

export const revokeSessionById = async (
  sessionId: string
): Promise<void> => {
  await pool.query(
    `UPDATE user_sessions SET is_active = false WHERE id = $1`,
    [sessionId]
  );
};

export const revokeSessionByTokenHash = async (
  tokenHash: string
): Promise<void> => {
  await pool.query(
    `UPDATE user_sessions SET is_active = false WHERE token_hash = $1`,
    [tokenHash]
  );
};

export const updateLastActive = async (
  sessionId: string
): Promise<void> => {
  await pool.query(
    `UPDATE user_sessions SET last_active_at = NOW() WHERE id = $1`,
    [sessionId]
  );
};

export const verifySession = async (
  userId: string,
  tokenHash: string
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT id FROM user_sessions
     WHERE user_id = $1 AND token_hash = $2 AND is_active = true AND expires_at > NOW()`,
    [userId, tokenHash]
  );
  return (result.rowCount ?? 0) > 0;
};
