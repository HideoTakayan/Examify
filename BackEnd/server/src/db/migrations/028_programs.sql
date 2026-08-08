-- Chuyên ngành (programs) — admin quản lý đa ngành trong một trường
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_code ON programs(code);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE RESTRICT;

INSERT INTO programs (code, name, description)
VALUES ('CNTTVJ', 'Công nghệ thông tin Việt Nhật', 'Chương trình CNTT Việt Nhật – Phenikaa University')
ON CONFLICT (code) DO NOTHING;

UPDATE subjects s
SET program_id = p.id
FROM programs p
WHERE p.code = 'CNTTVJ' AND s.program_id IS NULL;

-- Tên môn unique theo ngành (không còn unique toàn cục)
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_program_name
    ON subjects (program_id, name)
    WHERE program_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_program ON subjects(program_id);
