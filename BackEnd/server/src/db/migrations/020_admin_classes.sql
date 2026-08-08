-- =============================================================================
-- 020: Lớp hành chính (admin_class) + đề thi gắn lớp HC + môn học
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_code TEXT NOT NULL DEFAULT 'CNTTVJ',
    intake_year INTEGER NOT NULL,
    section TEXT NOT NULL,
    display_name TEXT NOT NULL,
    manager_teacher_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (program_code, intake_year, section)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_classes_manager_teacher
    ON admin_classes(manager_teacher_id)
    WHERE manager_teacher_id IS NOT NULL;

-- Sinh viên thuộc một lớp hành chính
ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS admin_class_id UUID REFERENCES admin_classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_admin_class ON accounts(admin_class_id);

-- Môn học: thêm sub_category (6 khối lớn đã có trong category)
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Đề thi: lớp HC + môn (class_id giữ để tương thích cũ, có thể null)
ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS admin_class_id UUID REFERENCES admin_classes(id) ON DELETE RESTRICT;

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_exams_admin_class ON exams(admin_class_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id);

-- Cho phép class_id null trên đề mới (đề cũ vẫn có class_id)
ALTER TABLE exams ALTER COLUMN class_id DROP NOT NULL;

-- Chuẩn hóa mã môn (tránh null trên UI)
UPDATE subjects SET code = 'PE001' WHERE name = 'Lý luận và phương pháp Giáo dục thể chất 1' AND (code IS NULL OR code = '');
UPDATE subjects SET code = 'STAT001', category = 'foundation', sub_category = 'math'
    WHERE name ILIKE 'Xác suất thống kê%' AND (code IS NULL OR code = '');

-- Seed lớp DEMO CLASS
INSERT INTO admin_classes (program_code, intake_year, section, display_name, manager_teacher_id)
SELECT 'CNTTVJ', 16, '02', 'CNTTVJ 16-02', a.id
FROM accounts a
WHERE a.email = 'mai.xuan.trang@phenikaa-uni.edu.vn'
LIMIT 1
ON CONFLICT (program_code, intake_year, section) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        manager_teacher_id = COALESCE(admin_classes.manager_teacher_id, EXCLUDED.manager_teacher_id);

-- Gán SV seed vào lớp (nếu chưa có)
UPDATE accounts acc
SET admin_class_id = ac.id
FROM admin_classes ac
WHERE ac.program_code = 'CNTTVJ'
  AND acc.role = 'student'
  AND acc.admin_class_id IS NULL;

-- Gán GV chủ nhiệm nếu tài khoản gv01 tồn tại
UPDATE admin_classes ac
SET manager_teacher_id = a.id
FROM accounts a
WHERE ac.program_code = 'CNTTVJ'
  AND ac.manager_teacher_id IS NULL
  AND a.role = 'teacher'
  AND a.email = 'mai.xuan.trang@phenikaa-uni.edu.vn';

-- Backfill exams từ class_id cũ
UPDATE exams e
SET
    subject_id = c.subject_id,
    admin_class_id = COALESCE(
        e.admin_class_id,
        (SELECT ac.id FROM admin_classes ac LIMIT 1)
    )
FROM classes c
WHERE e.class_id = c.id
  AND e.subject_id IS NULL;

-- Gộp classes trùng: chuyển exams/enrollments sang bản ghi giữ lại
WITH canonical AS (
    SELECT DISTINCT ON (subject_id, teacher_id, semester, year)
        id AS keep_id, subject_id, teacher_id, semester, year
    FROM classes
    ORDER BY subject_id, teacher_id, semester, year, created_at DESC
),
dupes AS (
    SELECT c.id AS dup_id, can.keep_id
    FROM classes c
    JOIN canonical can
      ON can.subject_id = c.subject_id
     AND can.teacher_id = c.teacher_id
     AND can.semester = c.semester
     AND can.year = c.year
    WHERE c.id <> can.keep_id
)
UPDATE exams e
SET class_id = d.keep_id
FROM dupes d
WHERE e.class_id = d.dup_id;

WITH canonical AS (
    SELECT DISTINCT ON (subject_id, teacher_id, semester, year)
        id AS keep_id, subject_id, teacher_id, semester, year
    FROM classes
    ORDER BY subject_id, teacher_id, semester, year, created_at DESC
),
dupes AS (
    SELECT c.id AS dup_id, can.keep_id
    FROM classes c
    JOIN canonical can
      ON can.subject_id = c.subject_id
     AND can.teacher_id = c.teacher_id
     AND can.semester = c.semester
     AND can.year = c.year
    WHERE c.id <> can.keep_id
)
UPDATE enrollments en
SET class_id = d.keep_id
FROM dupes d
WHERE en.class_id = d.dup_id;

DELETE FROM enrollments a
USING enrollments b
WHERE a.class_id = b.class_id
  AND a.student_id = b.student_id
  AND a.ctid < b.ctid;

WITH canonical AS (
    SELECT DISTINCT ON (subject_id, teacher_id, semester, year) id AS keep_id
    FROM classes
    ORDER BY subject_id, teacher_id, semester, year, created_at DESC
)
DELETE FROM classes c
WHERE c.id NOT IN (SELECT keep_id FROM canonical);

CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_unique_offering
    ON classes(subject_id, teacher_id, semester, year);
