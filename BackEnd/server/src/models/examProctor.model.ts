import pool from "~/config/db";

// ---------------------------------------------------------------------------
// exam_proctor_presence
// ---------------------------------------------------------------------------

export interface ProctorPresenceRow {
  id: string;
  exam_id: string;
  student_id: string;
  socket_id: string;
  ip_address: string | null;
  user_agent: string | null;
  joined_at: string;
  last_ping_at: string;
  disconnected_at: string | null;
}

export interface ProctorPresenceWithStudent extends ProctorPresenceRow {
  student_name: string | null;
  student_email: string | null;
}

/** Insert or update presence when a student joins an exam room */
export const upsertProctorPresence = async (params: {
  examId: string;
  studentId: string;
  socketId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ProctorPresenceRow> => {
  const { examId, studentId, socketId, ipAddress, userAgent } = params;
  const result = await pool.query(
    `INSERT INTO exam_proctor_presence (exam_id, student_id, socket_id, ip_address, user_agent, joined_at, last_ping_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (exam_id, student_id) DO UPDATE SET
       socket_id = $3,
       ip_address = COALESCE($4, exam_proctor_presence.ip_address),
       user_agent = COALESCE($5, exam_proctor_presence.user_agent),
       last_ping_at = NOW(),
       disconnected_at = NULL
     RETURNING *`,
    [examId, studentId, socketId, ipAddress ?? null, userAgent ?? null]
  );
  return result.rows[0] as ProctorPresenceRow;
};

/** Update last_ping_at to keep presence alive */
export const touchProctorPresence = async (examId: string, studentId: string): Promise<void> => {
  await pool.query(
    `UPDATE exam_proctor_presence
     SET last_ping_at = NOW()
     WHERE exam_id = $1 AND student_id = $2 AND disconnected_at IS NULL`,
    [examId, studentId]
  );
};

/** Mark a student as disconnected (soft delete) */
export const disconnectProctorPresence = async (
  examId: string,
  socketId: string
): Promise<void> => {
  await pool.query(
    `UPDATE exam_proctor_presence
     SET disconnected_at = NOW()
     WHERE exam_id = $1 AND socket_id = $2 AND disconnected_at IS NULL`,
    [examId, socketId]
  );
};

/** Get all active presence entries for an exam */
export const getActivePresenceByExam = async (
  examId: string
): Promise<ProctorPresenceWithStudent[]> => {
  const result = await pool.query(
    `SELECT p.*, a.full_name AS student_name, a.email AS student_email
     FROM exam_proctor_presence p
     JOIN accounts a ON a.id = p.student_id
     WHERE p.exam_id = $1 AND p.disconnected_at IS NULL
     ORDER BY p.joined_at ASC`,
    [examId]
  );
  return result.rows as ProctorPresenceWithStudent[];
};

/** Get active presence for a specific student in an exam */
export const getActivePresenceForStudent = async (
  examId: string,
  studentId: string
): Promise<ProctorPresenceRow | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_proctor_presence
     WHERE exam_id = $1 AND student_id = $2 AND disconnected_at IS NULL`,
    [examId, studentId]
  );
  return (result.rows[0] as ProctorPresenceRow) ?? null;
};

/** Get presence count for an exam (active only) */
export const getPresenceCountByExam = async (examId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM exam_proctor_presence
     WHERE exam_id = $1 AND disconnected_at IS NULL`,
    [examId]
  );
  return Number(result.rows[0].count);
};

// ---------------------------------------------------------------------------
// exam_proctor_logs
// ---------------------------------------------------------------------------

export type ProctorLogEventType =
  | "screenshot"
  | "webcam_capture"
  | "ip_address_change"
  | "tab_switch"
  | "browser_devtools_open"
  | "console_open"
  | "network_change"
  | "error"
  | "fullscreen_enter"
  | "fullscreen_exit"
  | "blur"
  | "visibility_hidden";

export interface ProctorLogRow {
  id: string;
  exam_id: string;
  session_id: string | null;
  student_id: string;
  event_type: string;
  screenshot_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Insert a proctor log entry */
export const insertProctorLog = async (params: {
  examId: string;
  sessionId?: string | null;
  studentId: string;
  eventType: ProctorLogEventType;
  screenshotUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<ProctorLogRow> => {
  const { examId, sessionId, studentId, eventType, screenshotUrl, ipAddress, userAgent, metadata } =
    params;
  const result = await pool.query(
    `INSERT INTO exam_proctor_logs (exam_id, session_id, student_id, event_type, screenshot_url, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      examId,
      sessionId ?? null,
      studentId,
      eventType,
      screenshotUrl ?? null,
      ipAddress ?? null,
      userAgent ?? null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return result.rows[0] as ProctorLogRow;
};

/** Batch insert proctor log entries */
export const insertProctorLogs = async (
  entries: Array<{
    examId: string;
    sessionId?: string | null;
    studentId: string;
    eventType: ProctorLogEventType;
    screenshotUrl?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }>
): Promise<number> => {
  if (!entries.length) return 0;
  const values: Array<string | null> = [];
  const placeholders = entries
    .map((entry, idx) => {
      const base = idx * 8;
      values.push(
        entry.examId,
        entry.sessionId ?? null,
        entry.studentId,
        entry.eventType,
        entry.screenshotUrl ?? null,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    })
    .join(",");

  const result = await pool.query(
    `INSERT INTO exam_proctor_logs (exam_id, session_id, student_id, event_type, screenshot_url, ip_address, user_agent, metadata)
     VALUES ${placeholders}`,
    values
  );
  return result.rowCount ?? 0;
};

/** Get all proctor logs for an exam (for teacher/admin) */
export const getProctorLogsByExam = async (
  examId: string,
  options?: { limit?: number; offset?: number }
): Promise<ProctorLogRow[]> => {
  const { items } = await queryProctorLogsByExamPaginated(
    examId,
    options?.limit ?? 500,
    options?.offset ?? 0
  );
  return items;
};

export const queryProctorLogsByExamPaginated = async (
  examId: string,
  limit: number,
  offset: number
): Promise<{ items: ProctorLogRow[]; total: number }> => {
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM exam_proctor_logs WHERE exam_id = $1`,
    [examId]
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await pool.query(
    `SELECT pl.*, a.full_name AS student_name
     FROM exam_proctor_logs pl
     JOIN accounts a ON a.id = pl.student_id
     WHERE pl.exam_id = $1
     ORDER BY pl.created_at DESC
     LIMIT $2 OFFSET $3`,
    [examId, limit, offset]
  );
  return { items: result.rows as ProctorLogRow[], total };
};

/** Get proctor logs for a specific student in an exam */
export const getProctorLogsByStudent = async (
  examId: string,
  studentId: string,
  options?: { limit?: number }
): Promise<ProctorLogRow[]> => {
  const limit = options?.limit ?? 200;
  const result = await pool.query(
    `SELECT * FROM exam_proctor_logs
     WHERE exam_id = $1 AND student_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [examId, studentId, limit]
  );
  return result.rows as ProctorLogRow[];
};