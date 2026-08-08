-- Exam Versioning: supports multiple shuffled versions (codes) of the same exam
-- Each version has its own question_order and option_maps to reverse correct answers

CREATE TABLE IF NOT EXISTS exam_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    version_code    VARCHAR(10) NOT NULL,           -- display code e.g. "D01", "D02"
    version_index   INTEGER NOT NULL,                -- 0-based index for deterministic assignment

    -- Array of original question_ids in shuffled order shown to students
    -- Index in this array = display order shown to student
    -- Value = original question_id from questions table
    question_order  JSONB NOT NULL,                  -- [q3_id, q1_id, q2_id]

    -- For each question: maps shuffled option key → original option key
    -- e.g. { q1_id: {"A":"B","B":"A","C":"C","D":"D"}, q2_id: {...} }
    -- meaning: student's answer "A" maps to original "B"
    option_maps     JSONB NOT NULL,                  -- { q_id: { shuffled→original } }

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (exam_id, version_code),
    UNIQUE (exam_id, version_index)
);

CREATE INDEX IF NOT EXISTS idx_ev_exam       ON exam_versions(exam_id);
CREATE INDEX IF NOT EXISTS idx_ev_code      ON exam_versions(exam_id, version_code);

-- Add version columns to exam_sessions
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS version_id     UUID REFERENCES exam_versions(id);
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS version_code  VARCHAR(10);  -- "D01"
