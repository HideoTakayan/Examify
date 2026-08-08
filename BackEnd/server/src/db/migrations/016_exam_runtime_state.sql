-- Exam Runtime State: persists exam timer state to DB for server restart recovery
CREATE TABLE IF NOT EXISTS exam_runtime_state (
    exam_id UUID PRIMARY KEY REFERENCES exams(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    duration_min INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_runtime_active ON exam_runtime_state(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_runtime_ends_at ON exam_runtime_state(ends_at);