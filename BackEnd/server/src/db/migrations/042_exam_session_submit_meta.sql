-- submit_source: cách nộp bài; disconnect_flag: mất kết nối lâu trước khi ép nộp.

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS submit_source TEXT
    CHECK (submit_source IS NULL OR submit_source IN ('student', 'force_submit', 'violation_auto', 'timer'));

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS disconnect_flag BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_sessions_submit_source
  ON exam_sessions(exam_id, submit_source)
  WHERE submit_source IS NOT NULL;
