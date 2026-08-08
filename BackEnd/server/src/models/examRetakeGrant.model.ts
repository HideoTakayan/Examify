import pool from "~/config/db";

export type RetakeGrantStatus = "approved" | "consumed" | "revoked";

export interface ExamRetakeGrant {
  id: string;
  exam_id: string;
  student_id: string;
  granted_by: string;
  reason: string;
  status: RetakeGrantStatus;
  superseded_session_id: string | null;
  consumed_session_id: string | null;
  granted_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export const createRetakeGrant = async (payload: {
  exam_id: string;
  student_id: string;
  granted_by: string;
  reason: string;
  superseded_session_id: string | null;
}): Promise<ExamRetakeGrant> => {
  const r = await pool.query(
    `INSERT INTO exam_retake_grants
       (exam_id, student_id, granted_by, reason, superseded_session_id, status)
     VALUES ($1, $2, $3, $4, $5, 'approved')
     RETURNING *`,
    [
      payload.exam_id,
      payload.student_id,
      payload.granted_by,
      payload.reason,
      payload.superseded_session_id,
    ]
  );
  return r.rows[0] as ExamRetakeGrant;
};

export const getApprovedRetakeGrant = async (
  examId: string,
  studentId: string
): Promise<ExamRetakeGrant | null> => {
  const r = await pool.query(
    `SELECT * FROM exam_retake_grants
     WHERE exam_id = $1 AND student_id = $2 AND status = 'approved'
     ORDER BY granted_at DESC
     LIMIT 1`,
    [examId, studentId]
  );
  return (r.rows[0] as ExamRetakeGrant) ?? null;
};

export const getRetakeGrantsByExam = async (examId: string): Promise<ExamRetakeGrant[]> => {
  const r = await pool.query(
    `SELECT * FROM exam_retake_grants
     WHERE exam_id = $1
     ORDER BY granted_at DESC`,
    [examId]
  );
  return r.rows as ExamRetakeGrant[];
};

export const getMyApprovedRetakeGrants = async (
  studentId: string
): Promise<ExamRetakeGrant[]> => {
  const r = await pool.query(
    `SELECT * FROM exam_retake_grants
     WHERE student_id = $1 AND status = 'approved'
     ORDER BY granted_at DESC`,
    [studentId]
  );
  return r.rows as ExamRetakeGrant[];
};

export const consumeRetakeGrant = async (
  grantId: string,
  consumedSessionId: string
): Promise<ExamRetakeGrant | null> => {
  const r = await pool.query(
    `UPDATE exam_retake_grants
     SET status = 'consumed',
         consumed_session_id = $2,
         consumed_at = NOW()
     WHERE id = $1 AND status = 'approved'
     RETURNING *`,
    [grantId, consumedSessionId]
  );
  return (r.rows[0] as ExamRetakeGrant) ?? null;
};

export const revokeRetakeGrant = async (grantId: string): Promise<ExamRetakeGrant | null> => {
  const r = await pool.query(
    `UPDATE exam_retake_grants
     SET status = 'revoked', revoked_at = NOW()
     WHERE id = $1 AND status = 'approved'
     RETURNING *`,
    [grantId]
  );
  return (r.rows[0] as ExamRetakeGrant) ?? null;
};

export const voidSessionForRetake = async (
  sessionId: string,
  grantId: string,
  reason: string
): Promise<void> => {
  await pool.query(
    `UPDATE exam_sessions
     SET voided_at = NOW(),
         void_reason = $3,
         retake_grant_id = $2
     WHERE id = $1 AND voided_at IS NULL`,
    [sessionId, grantId, reason]
  );
};

export const linkSupersededBy = async (
  oldSessionId: string,
  newSessionId: string
): Promise<void> => {
  await pool.query(
    `UPDATE exam_sessions SET superseded_by = $2 WHERE id = $1`,
    [oldSessionId, newSessionId]
  );
};
