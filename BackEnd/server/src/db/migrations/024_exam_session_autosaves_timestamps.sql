-- Bổ sung cột cho exam_session_autosaves (schema 009 thiếu created_at/updated_at so với 003)

ALTER TABLE exam_session_autosaves
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE exam_session_autosaves
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Đồng bộ timestamp cho dòng cũ (nếu vừa thêm cột)
UPDATE exam_session_autosaves
SET
  created_at = COALESCE(created_at, server_at, saved_at, NOW()),
  updated_at = COALESCE(updated_at, server_at, saved_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Upsert autosave theo session_id (một bản ghi / phiên)
DELETE FROM exam_session_autosaves a
USING exam_session_autosaves b
WHERE a.session_id = b.session_id
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_autosave_session_unique
  ON exam_session_autosaves (session_id);
