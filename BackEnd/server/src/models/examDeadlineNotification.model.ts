import pool from "~/config/db";

export type ExamDeadlineReminderKind = "24h" | "1h";

export const markExamReminderSent = async (
  examId: string,
  kind: ExamDeadlineReminderKind
): Promise<void> => {
  await pool.query(
    `INSERT INTO exam_deadline_notifications (exam_id, kind) VALUES ($1, $2)
     ON CONFLICT (exam_id, kind) DO NOTHING`,
    [examId, kind]
  );
};

export const hasExamReminderBeenSent = async (
  examId: string,
  kind: ExamDeadlineReminderKind
): Promise<boolean> => {
  const r = await pool.query(
    "SELECT 1 FROM exam_deadline_notifications WHERE exam_id = $1 AND kind = $2",
    [examId, kind]
  );
  return r.rows.length > 0;
};
