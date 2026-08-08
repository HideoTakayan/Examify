-- Cache kết quả dự đoán AI (MiniMax) theo sinh viên — admin tính batch, SV chỉ đọc cache
CREATE TABLE IF NOT EXISTS student_prediction_cache (
  user_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_prediction_cache_computed
  ON student_prediction_cache (computed_at DESC);
