import pool from "~/config/db";
import { startExamRuntimeFromServer, finalizeExamRuntimeByExamId } from "~/socket/examSocket";

const TICK_MS = 15_000;

const SCHEDULED_START_ELIGIBLE_SQL = `
  SELECT e.id
  FROM exams e
  WHERE e.opens_at IS NOT NULL
    AND e.ends_at IS NOT NULL
    AND e.opens_at <= NOW()
    AND e.ends_at > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM exam_runtime_state rs
      WHERE rs.exam_id = e.id
        AND rs.is_active = true
        AND rs.ends_at > NOW()
    )
    AND NOT EXISTS (
      SELECT 1 FROM exam_runtime_state rs2
      WHERE rs2.exam_id = e.id
        AND rs2.is_active = true
        AND rs2.started_at < e.opens_at
    )
`;

/** Thử mở phiên theo lịch cho một đề (gọi từ poll getExam hoặc startSession). */
export async function tryStartScheduledExamById(examId: string): Promise<boolean> {
  const r = await pool.query<{ id: string }>(
    `${SCHEDULED_START_ELIGIBLE_SQL} AND e.id = $1`,
    [examId]
  );
  if (r.rows.length === 0) return false;
  try {
    await startExamRuntimeFromServer(examId, "scheduled");
    console.log(`[exam-schedule] auto-started exam=${examId} (on-demand)`);
    return true;
  } catch (err) {
    console.error(`[exam-schedule] on-demand auto-start failed exam=${examId}`, err);
    return false;
  }
}

async function autoStartScheduledExams(): Promise<void> {
  const r = await pool.query<{ id: string }>(SCHEDULED_START_ELIGIBLE_SQL);

  for (const row of r.rows) {
    try {
      await startExamRuntimeFromServer(row.id, "scheduled");
      console.log(`[exam-schedule] auto-started exam=${row.id} (opens_at→ends_at)`);
    } catch (err) {
      console.error(`[exam-schedule] auto-start failed exam=${row.id}`, err);
    }
  }
}

async function autoEndScheduledExams(): Promise<void> {
  const r = await pool.query<{ exam_id: string }>(
    `
    SELECT rs.exam_id
    FROM exam_runtime_state rs
    WHERE rs.is_active = true
      AND rs.ends_at <= NOW()
    `
  );

  for (const row of r.rows) {
    try {
      await finalizeExamRuntimeByExamId(row.exam_id);
      console.log(`[exam-schedule] auto-ended exam=${row.exam_id}`);
    } catch (err) {
      console.error(`[exam-schedule] auto-end failed exam=${row.exam_id}`, err);
    }
  }
}

async function tick(): Promise<void> {
  try {
    await autoStartScheduledExams();
    await autoEndScheduledExams();
  } catch (err) {
    console.error("[exam-schedule] tick error", err);
  }
}

export function startExamScheduleScheduler(): void {
  void tick();
  setInterval(() => {
    void tick();
  }, TICK_MS);
  console.log(`[exam-schedule] scheduler every ${TICK_MS / 1000}s`);
}
