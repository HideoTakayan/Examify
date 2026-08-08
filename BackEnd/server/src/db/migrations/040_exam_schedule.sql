-- Lịch thi: giờ mở (opens_at) và giờ kết thúc / tự nộp (ends_at).

ALTER TABLE exams ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ NULL;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_exams_opens_at ON exams(opens_at) WHERE opens_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exams_ends_at ON exams(ends_at) WHERE ends_at IS NOT NULL;

COMMENT ON COLUMN exams.opens_at IS 'Giờ mở thi — hệ thống tự start-runtime khi đến giờ';
COMMENT ON COLUMN exams.ends_at IS 'Giờ kết thúc — hệ thống tự force-submit khi đến giờ';
