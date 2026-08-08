import pool from "~/config/db";

export type SessionStatus = "active" | "submitted" | "expired";
export type GradingStatus = "pending_manual" | "complete";

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  status: SessionStatus;
  created_at: string;
  score: number | null;
  max_points: number | null;
  student_answers: Record<string, string | string[]> | null;
  graded_details: unknown | null;
  grading_status: GradingStatus | null;
  version_id: string | null;
  version_code: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  superseded_by?: string | null;
  retake_grant_id?: string | null;
  submit_source?: "student" | "force_submit" | "violation_auto" | "timer" | null;
  disconnect_flag?: boolean;
}

export interface SessionWithExamMeta extends ExamSession {
  exam_created_by: string;
  exam_title: string;
  exam_duration_min: number;
  version_id: string | null;
  version_code: string | null;
}

export const getSessionById = async (id: string): Promise<ExamSession | null> => {
  const result = await pool.query("SELECT * FROM exam_sessions WHERE id = $1", [id]);
  return (result.rows[0] as ExamSession) ?? null;
};

export const getSessionWithExam = async (
  sessionId: string
): Promise<SessionWithExamMeta | null> => {
  const result = await pool.query(
    `SELECT es.*,
            e.created_by AS exam_created_by,
            e.title AS exam_title,
            e.duration_min AS exam_duration_min
     FROM exam_sessions es
     JOIN exams e ON e.id = es.exam_id
     WHERE es.id = $1`,
    [sessionId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...(row as ExamSession),
    exam_created_by: row.exam_created_by,
    exam_title: row.exam_title,
    exam_duration_min: row.exam_duration_min,
    version_id: row.version_id ?? null,
    version_code: row.version_code ?? null,
  };
};

export const getActiveSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession | null> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE exam_id = $1 AND student_id = $2 AND status = 'active' AND voided_at IS NULL",
    [examId, studentId]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

/** Ghi integrity sau khi nộp: không còn active nhưng vẫn có phiên submitted. */
export const getSessionForIntegrityLogging = async (
  examId: string,
  studentId: string
): Promise<ExamSession | null> => {
  const active = await getActiveSession(examId, studentId);
  if (active) return active;
  return getLatestSubmittedSession(examId, studentId);
};

export function sessionAllowsStudentReview(session: ExamSession): boolean {
  if (session.status === "submitted" || session.status === "expired") return true;
  return Boolean(session.submitted_at);
}

export const getActiveSessionsByExam = async (examId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    `SELECT *
     FROM exam_sessions
     WHERE exam_id = $1 AND status = 'active'
     ORDER BY created_at ASC`,
    [examId]
  );
  return result.rows as ExamSession[];
};

export const getSessionsByStudent = async (studentId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    "SELECT * FROM exam_sessions WHERE student_id = $1 ORDER BY created_at DESC",
    [studentId]
  );
  return result.rows as ExamSession[];
};

export const getSessionsByExam = async (examId: string): Promise<ExamSession[]> => {
  const result = await pool.query(
    `
    SELECT es.*, a.full_name, a.email
    FROM exam_sessions es
    JOIN accounts a ON a.id = es.student_id
    WHERE es.exam_id = $1
    ORDER BY es.created_at DESC
  `,
    [examId]
  );
  return result.rows as ExamSession[];
};

export const createSession = async (examId: string, studentId: string): Promise<ExamSession> => {
  const result = await pool.query(
    `INSERT INTO exam_sessions (exam_id, student_id, started_at, status)
     VALUES ($1, $2, NOW(), 'active') RETURNING *`,
    [examId, studentId]
  );
  return result.rows[0] as ExamSession;
};

export const finalizeSessionSubmit = async (
  id: string,
  payload: {
    score: number;
    max_points: number;
    student_answers: Record<string, string | string[]>;
    graded_details: unknown;
    grading_status: GradingStatus;
    submit_source?: ExamSession["submit_source"];
    disconnect_flag?: boolean;
  }
): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET status = 'submitted',
         submitted_at = NOW(),
         score = $2,
         max_points = $3,
         student_answers = $4::jsonb,
         graded_details = $5::jsonb,
         grading_status = $6,
         submit_source = COALESCE($7, submit_source, 'student'),
         disconnect_flag = COALESCE($8, disconnect_flag, FALSE)
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [
      id,
      payload.score,
      payload.max_points,
      JSON.stringify(payload.student_answers),
      JSON.stringify(payload.graded_details),
      payload.grading_status,
      payload.submit_source ?? "student",
      payload.disconnect_flag ?? false,
    ]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const updateSessionGrading = async (
  id: string,
  payload: {
    score: number;
    graded_details: unknown;
    grading_status: GradingStatus;
    student_answers?: Record<string, string | string[]>;
  }
): Promise<ExamSession | null> => {
  const sets = ["score = $2", "graded_details = $3::jsonb", "grading_status = $4"];
  const params: unknown[] = [
    id,
    payload.score,
    JSON.stringify(payload.graded_details),
    payload.grading_status,
  ];
  if (payload.student_answers !== undefined) {
    sets.push(`student_answers = $${params.length + 1}::jsonb`);
    params.push(JSON.stringify(payload.student_answers));
  }
  const result = await pool.query(
    `UPDATE exam_sessions
     SET ${sets.join(", ")}
     WHERE id = $1 AND status = 'submitted'
     RETURNING *`,
    params
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const getLatestSubmittedSession = async (
  examId: string,
  studentId: string
): Promise<ExamSession | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_sessions
     WHERE exam_id = $1 AND student_id = $2 AND status = 'submitted' AND voided_at IS NULL
     ORDER BY submitted_at DESC NULLS LAST
     LIMIT 1`,
    [examId, studentId]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export const expireSession = async (id: string): Promise<ExamSession | null> => {
  const result = await pool.query(
    `UPDATE exam_sessions
     SET status = 'expired', submitted_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return (result.rows[0] as ExamSession) ?? null;
};

export interface SessionWithStudent extends ExamSession {
  student_name: string | null;
  student_email: string | null;
}

export const getSessionsByExamWithStudent = async (
  examId: string
): Promise<SessionWithStudent[]> => {
  const result = await pool.query(
    `SELECT es.*, a.full_name AS student_name, a.email AS student_email
     FROM exam_sessions es
     JOIN accounts a ON a.id = es.student_id
     WHERE es.exam_id = $1
     ORDER BY es.created_at ASC`,
    [examId]
  );
  return result.rows as SessionWithStudent[];
};

export const querySessionsByExamPaginated = async (
  examId: string,
  limit: number,
  offset: number
): Promise<{ items: SessionWithStudent[]; total: number }> => {
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM exam_sessions WHERE exam_id = $1`,
    [examId]
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await pool.query(
    `SELECT es.*, a.full_name AS student_name, a.email AS student_email
     FROM exam_sessions es
     JOIN accounts a ON a.id = es.student_id
     WHERE es.exam_id = $1
     ORDER BY es.created_at ASC
     LIMIT $2 OFFSET $3`,
    [examId, limit, offset]
  );
  return { items: result.rows as SessionWithStudent[], total };
};