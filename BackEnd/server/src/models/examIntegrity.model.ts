import pool from "~/config/db";
import { STRIKE_EVENT_TYPES } from "~/utils/examIntegrityPolicy";

export type IntegrityEventType =
  | "exam_opened"
  | "fullscreen_enter"
  | "fullscreen_exit"
  | "fullscreen_error"
  | "visibility_hidden"
  | "window_blur"
  | "window_focus"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu"
  | "before_unload";

export interface IntegrityEventInput {
  type: IntegrityEventType;
  at: string;
  details?: Record<string, unknown>;
}

export const insertIntegrityEvents = async (
  examId: string,
  sessionId: string,
  studentId: string,
  events: IntegrityEventInput[]
): Promise<number> => {
  if (!events.length) return 0;

  const values: Array<string | null> = [];
  const placeholders = events
    .map((event, idx) => {
      const base = idx * 6;
      values.push(
        examId,
        sessionId,
        studentId,
        event.type,
        event.at,
        event.details ? JSON.stringify(event.details) : null
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb)`;
    })
    .join(",");

  const result = await pool.query(
    `INSERT INTO exam_integrity_events
      (exam_id, session_id, student_id, event_type, event_at, details)
     VALUES ${placeholders}`,
    values
  );

  return result.rowCount ?? 0;
};

export const getIntegrityEventsBySession = async (
  sessionId: string
): Promise<Array<{
  id: string;
  exam_id: string;
  student_id: string;
  event_type: string;
  client_at: string;
  details: Record<string, unknown> | null;
  created_at: string;
}>> => {
  const result = await pool.query(
    `SELECT id, exam_id, student_id, event_type, event_at AS client_at, details, created_at
     FROM exam_integrity_events
     WHERE session_id = $1
     ORDER BY event_at ASC`,
    [sessionId]
  );
  return result.rows;
};

export const getIntegrityEventsByExam = async (
  examId: string
): Promise<Array<{
  id: string;
  exam_id: string;
  session_id: string;
  student_id: string;
  event_type: string;
  client_at: string;
  details: Record<string, unknown> | null;
  created_at: string;
}>> => {
  const result = await pool.query(
    `SELECT id, exam_id, session_id, student_id, event_type, event_at AS client_at, details, created_at
     FROM exam_integrity_events
     WHERE exam_id = $1
     ORDER BY event_at ASC`,
    [examId]
  );
  return result.rows;
};

/** Đếm số sự kiện vi phạm (cảnh cáo) của một phiên — dùng cho auto-submit phía server. */
export const countStrikeEventsBySession = async (sessionId: string): Promise<number> => {
  const result = await pool.query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt
     FROM exam_integrity_events
     WHERE session_id = $1
       AND event_type = ANY($2::text[])`,
    [sessionId, [...STRIKE_EVENT_TYPES]]
  );
  return result.rows[0]?.cnt ?? 0;
};