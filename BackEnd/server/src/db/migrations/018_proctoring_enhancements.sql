-- Migration 018: Proctoring enhancements
-- - exam_proctor_presence: real-time presence tracking per exam+student
-- - exam_proctor_logs: advanced proctoring events with IP, UA, screenshot URL, metadata JSONB

-- Presence table: tracks which students are currently in an exam room via Socket.IO
CREATE TABLE IF NOT EXISTS exam_proctor_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    socket_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_presence_exam ON exam_proctor_presence (exam_id);
CREATE INDEX IF NOT EXISTS idx_presence_student ON exam_proctor_presence (student_id);

ALTER TABLE exam_proctor_presence ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_presence_exam_active ON exam_proctor_presence (exam_id) WHERE disconnected_at IS NULL;

-- Proctor log table: advanced proctoring events
CREATE TABLE IF NOT EXISTS exam_proctor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    session_id UUID NULL REFERENCES exam_sessions(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    -- Event types: screenshot, webcam_capture, ip_address_change, tab_switch,
    --              browser_devtools_open, console_open, network_change, error
    screenshot_url TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctor_logs_exam ON exam_proctor_logs (exam_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_student ON exam_proctor_logs (student_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_session ON exam_proctor_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_proctor_logs_created ON exam_proctor_logs (created_at DESC);

-- Update exam_integrity_events column name for consistency (client_at → event_at was the old name; fix it)
-- Note: This is a no-op if the column already exists with the old name in existing DBs.
-- We handle the alias in the model layer (examIntegrity.model.ts) for backward compat.