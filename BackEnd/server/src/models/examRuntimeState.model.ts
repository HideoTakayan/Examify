import pool from "~/config/db";
import type { Server } from "socket.io";

export interface ExamRuntimePersist {
  exam_id: string;
  started_at: string;    // ISO timestamp from DB
  ends_at: string;       // ISO timestamp from DB
  duration_min: number;
  is_active: boolean;
}

/** Persist exam runtime state to DB when exam starts */
export const saveExamRuntimeStart = async (
  examId: string,
  startedAt: Date,
  endsAt: Date,
  durationMin: number
): Promise<void> => {
  await pool.query(
    `INSERT INTO exam_runtime_state (exam_id, started_at, ends_at, duration_min, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (exam_id) DO UPDATE SET
       started_at = $2, ends_at = $3, duration_min = $4, is_active = true`,
    [examId, startedAt.toISOString(), endsAt.toISOString(), durationMin]
  );
};

/** Update exam runtime state when exam ends */
export const saveExamRuntimeEnd = async (examId: string): Promise<void> => {
  await pool.query(
    `UPDATE exam_runtime_state SET is_active = false WHERE exam_id = $1`,
    [examId]
  );
};

/** Get active exam runtimes for timer restoration on server startup */
export const getActiveExamRuntimes = async (): Promise<ExamRuntimePersist[]> => {
  const result = await pool.query(
    `SELECT exam_id, started_at, ends_at, duration_min, is_active
     FROM exam_runtime_state
     WHERE is_active = true AND ends_at > NOW()`
  );
  return result.rows.map(r => ({
    exam_id: r.exam_id,
    started_at: r.started_at,
    ends_at: r.ends_at,
    duration_min: Number(r.duration_min),
    is_active: r.is_active,
  }));
};

/** Get runtime state for a specific exam (used when student joins) */
export const getRuntimeStateByExam = async (examId: string): Promise<ExamRuntimePersist | null> => {
  const result = await pool.query(
    `SELECT exam_id, started_at, ends_at, duration_min, is_active
     FROM exam_runtime_state
     WHERE exam_id = $1`,
    [examId]
  );
  const r = result.rows[0];
  if (!r) return null;
  return {
    exam_id: r.exam_id,
    started_at: r.started_at,
    ends_at: r.ends_at,
    duration_min: Number(r.duration_min),
    is_active: r.is_active,
  };
};

/** Restore exam runtime state from DB on server startup */
type ExamRuntimeMemory = {
  examId: string;
  startedAtMs: number;
  endsAtMs: number;
  durationMin: number;
  final15Timer?: NodeJS.Timeout;
  endTimer?: NodeJS.Timeout;
};

export const restoreExamRuntimes = async (
  io: Server,
  examStateStore: Map<string, ExamRuntimeMemory>
): Promise<void> => {
  const actives = await getActiveExamRuntimes();

  for (const runtime of actives) {
    const startedAtMs = new Date(runtime.started_at).getTime();
    const endsAtMs = new Date(runtime.ends_at).getTime();
    const now = Date.now();
    const remaining = endsAtMs - now;

    if (remaining <= 0) {
      // Already expired — mark inactive and skip
      await saveExamRuntimeEnd(runtime.exam_id);
      continue;
    }

    // Reconstruct in-memory state
    const state: ExamRuntimeMemory = {
      examId: runtime.exam_id,
      startedAtMs,
      endsAtMs,
      durationMin: runtime.duration_min,
    };

    // Schedule final-15 and end timers
    const msUntilFinal15 = Math.max(0, (runtime.duration_min - 15) * 60_000 - (now - startedAtMs));
    if (msUntilFinal15 > 0 && msUntilFinal15 <= (runtime.duration_min * 60_000)) {
      state.final15Timer = setTimeout(() => {
        io.to(`exam:${runtime.exam_id}`).emit("exam:final_15m", {
          examId: runtime.exam_id,
          message: "Còn 15 phút để hoàn tất bài thi.",
          at: new Date().toISOString(),
        });
      }, msUntilFinal15);
    }

    state.endTimer = setTimeout(async () => {
      io.to(`exam:${runtime.exam_id}`).emit("exam:force_submit", {
        examId: runtime.exam_id,
        message: "Hết giờ làm bài. Hệ thống đã tự động nộp bài trên server.",
        at: new Date().toISOString(),
      });
      await saveExamRuntimeEnd(runtime.exam_id);
      examStateStore.delete(runtime.exam_id);
    }, remaining);

    examStateStore.set(runtime.exam_id, state);
    console.log(`[restore] exam ${runtime.exam_id} restored, ${Math.floor(remaining / 60000)} min remaining`);
  }
};