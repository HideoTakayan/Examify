import pool from "~/config/db";

export type ResetRequestStatus = "pending" | "approved" | "rejected" | "expired";

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  requested_by: string;
  status: ResetRequestStatus;
  admin_note: string | null;
  approved_by: string | null;
  new_password_plain: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetRequestWithUser extends PasswordResetRequest {
  user_full_name: string | null;
  user_email: string;
  requested_by_full_name: string | null;
  approved_by_full_name: string | null;
}

export const createPasswordResetRequest = async (
  userId: string,
  requestedBy: string
): Promise<PasswordResetRequest> => {
  const result = await pool.query(
    `INSERT INTO password_reset_requests (user_id, requested_by, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '3 days')
     RETURNING *`,
    [userId, requestedBy]
  );
  return result.rows[0] as PasswordResetRequest;
};

export const getPasswordResetRequestById = async (
  id: string
): Promise<PasswordResetRequest | null> => {
  const result = await pool.query(
    "SELECT * FROM password_reset_requests WHERE id = $1",
    [id]
  );
  return (result.rows[0] as PasswordResetRequest) ?? null;
};

export const getPendingResetRequests = async (): Promise<
  PasswordResetRequestWithUser[]
> => {
  const result = await pool.query(
    `SELECT pr.*,
            u.full_name AS user_full_name, u.email AS user_email,
            rb.full_name AS requested_by_full_name,
            apb.full_name AS approved_by_full_name
     FROM password_reset_requests pr
     JOIN accounts u ON u.id = pr.user_id
     JOIN accounts rb ON rb.id = pr.requested_by
     LEFT JOIN accounts apb ON apb.id = pr.approved_by
     WHERE pr.status = 'pending'
       AND pr.expires_at > NOW()
     ORDER BY pr.created_at DESC`
  );
  return result.rows as PasswordResetRequestWithUser[];
};

const pendingResetBaseSql = `
  FROM password_reset_requests pr
  JOIN accounts u ON u.id = pr.user_id
  JOIN accounts rb ON rb.id = pr.requested_by
  LEFT JOIN accounts apb ON apb.id = pr.approved_by
  WHERE pr.status = 'pending' AND pr.expires_at > NOW()
`;

export const queryPendingResetRequestsPaginated = async (
  limit: number,
  offset: number
): Promise<{ items: PasswordResetRequestWithUser[]; total: number }> => {
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${pendingResetBaseSql}`
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await pool.query(
    `SELECT pr.*,
            u.full_name AS user_full_name, u.email AS user_email,
            rb.full_name AS requested_by_full_name,
            apb.full_name AS approved_by_full_name
     ${pendingResetBaseSql}
     ORDER BY pr.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return { items: result.rows as PasswordResetRequestWithUser[], total };
};

export const getResetRequestsByUser = async (
  userId: string
): Promise<PasswordResetRequest[]> => {
  const result = await pool.query(
    `SELECT * FROM password_reset_requests
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows as PasswordResetRequest[];
};

export const updateResetRequestStatus = async (
  id: string,
  status: ResetRequestStatus,
  approvedBy: string,
  adminNote?: string,
  newPasswordPlain?: string
): Promise<PasswordResetRequest | null> => {
  const result = await pool.query(
    `UPDATE password_reset_requests
     SET status = $2,
         approved_by = $3,
         admin_note = $4,
         new_password_plain = $5,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, approvedBy, adminNote ?? null, newPasswordPlain ?? null]
  );
  return (result.rows[0] as PasswordResetRequest) ?? null;
};

export const expireOldResetRequests = async (): Promise<number> => {
  const result = await pool.query(
    `UPDATE password_reset_requests
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending' AND expires_at < NOW()`
  );
  return result.rowCount ?? 0;
};
