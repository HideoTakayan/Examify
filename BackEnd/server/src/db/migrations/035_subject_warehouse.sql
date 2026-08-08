-- Kho môn: nhóm + môn không thuộc một ngành; ngành gán qua bảng liên kết

ALTER TABLE subject_groups ADD COLUMN IF NOT EXISTS group_scope TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE subject_groups DROP CONSTRAINT IF EXISTS subject_groups_group_scope_check;
ALTER TABLE subject_groups ADD CONSTRAINT subject_groups_group_scope_check
  CHECK (group_scope IN ('base', 'shared', 'catalog'));

ALTER TABLE subject_groups ALTER COLUMN program_id DROP NOT NULL;

ALTER TABLE subject_groups DROP CONSTRAINT IF EXISTS subject_groups_program_id_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_groups_code_lower ON subject_groups (LOWER(code));

CREATE TABLE IF NOT EXISTS program_subject_groups (
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  subject_group_id UUID NOT NULL REFERENCES subject_groups(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, subject_group_id)
);

CREATE INDEX IF NOT EXISTS idx_program_subject_groups_program ON program_subject_groups(program_id);

CREATE TABLE IF NOT EXISTS program_subjects (
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (program_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_program_subjects_program ON program_subjects(program_id);

-- Gán nhóm theo program_id cũ → bảng liên kết
INSERT INTO program_subject_groups (program_id, subject_group_id, sort_order)
SELECT sg.program_id, sg.id, sg.sort_order
FROM subject_groups sg
WHERE sg.program_id IS NOT NULL
ON CONFLICT (program_id, subject_group_id) DO NOTHING;

INSERT INTO program_subjects (program_id, subject_id)
SELECT s.program_id, s.id
FROM subjects s
WHERE s.program_id IS NOT NULL
ON CONFLICT (program_id, subject_id) DO NOTHING;

UPDATE subject_groups SET program_id = NULL WHERE program_id IS NOT NULL;
UPDATE subjects SET program_id = NULL WHERE program_id IS NOT NULL;

UPDATE subject_groups SET group_scope = 'base'
WHERE LOWER(code) IN ('pe', 'defense', 'philosophy', 'english', 'national_defense', 'soft_skills');

UPDATE subject_groups SET group_scope = 'shared'
WHERE LOWER(code) IN ('math', 'programming', 'software', 'ai_iot', 'network', 'software_eng');
