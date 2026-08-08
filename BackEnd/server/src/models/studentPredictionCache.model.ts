import pool from "~/config/db";
import type { PredictionResult } from "~/services/prediction.service";

export async function getCachedPredictionByUserId(userId: string): Promise<PredictionResult | null> {
  const r = await pool.query<{ payload: PredictionResult }>(
    `SELECT payload FROM student_prediction_cache WHERE user_id = $1`,
    [userId]
  );
  const row = r.rows[0];
  if (!row?.payload) return null;
  return row.payload as PredictionResult;
}

export async function upsertPredictionCache(userId: string, payload: PredictionResult): Promise<void> {
  await pool.query(
    `INSERT INTO student_prediction_cache (user_id, payload, computed_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       payload = EXCLUDED.payload,
       computed_at = NOW()`,
    [userId, JSON.stringify(payload)]
  );
}

export async function deletePredictionCacheByUserId(userId: string): Promise<void> {
  await pool.query(`DELETE FROM student_prediction_cache WHERE user_id = $1`, [userId]);
}
