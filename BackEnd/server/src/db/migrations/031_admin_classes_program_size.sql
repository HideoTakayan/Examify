-- Admin classes: program FK, optional size, allow teacher to manage up to 2 classes
DROP INDEX IF EXISTS idx_admin_classes_manager_teacher;

ALTER TABLE admin_classes ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE RESTRICT;
ALTER TABLE admin_classes ADD COLUMN IF NOT EXISTS expected_size INTEGER NOT NULL DEFAULT 0;

ALTER TABLE admin_classes DROP CONSTRAINT IF EXISTS admin_classes_expected_size_check;
ALTER TABLE admin_classes ADD CONSTRAINT admin_classes_expected_size_check CHECK (expected_size >= 0);

UPDATE admin_classes ac
SET program_id = p.id
FROM programs p
WHERE ac.program_id IS NULL AND upper(trim(ac.program_code)) = upper(trim(p.code));

UPDATE admin_classes
SET program_id = (SELECT id FROM programs WHERE code = 'CNTTVJ' LIMIT 1)
WHERE program_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_classes_program ON admin_classes(program_id);
