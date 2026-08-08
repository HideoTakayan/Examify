-- Question Bank — independent question pool for reuse across exams
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES accounts(id),
    subject_id UUID REFERENCES subjects(id),
    content TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'essay')),
    options JSONB, -- for MCQ only
    correct_answer JSONB, -- for MCQ only; stored but may be hidden
    points DECIMAL(4,1) NOT NULL DEFAULT 1,
    difficulty TEXT DEFAULT 'TRUNGBINH' CHECK (difficulty IN ('DE', 'TRUNGBINH', 'KHO')),
    chapter INTEGER,
    answer_hint TEXT,
    explanation TEXT, -- giải thích đáp án (teacher only)
    tags TEXT[], -- e.g. ['python', 'loop', 'function']
    source_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL, -- optional: imported from which exam
    usage_count INTEGER NOT NULL DEFAULT 0, -- số lần được gắn vào exam
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qb_subject ON question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_chapter ON question_bank(chapter);
CREATE INDEX IF NOT EXISTS idx_qb_created_by ON question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_qb_tags ON question_bank USING GIN(tags);

-- Add FK from questions table to question_bank (optional link)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_bank_id UUID REFERENCES question_bank(id) ON DELETE SET NULL;

COMMENT ON TABLE question_bank IS 'Ngân hàng câu hỏi độc lập — tái sử dụng giữa nhiều đề thi';
COMMENT ON COLUMN question_bank.usage_count IS 'Số lần câu hỏi được gắn vào exam (qua questions.question_bank_id)';