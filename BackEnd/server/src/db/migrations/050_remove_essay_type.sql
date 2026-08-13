-- Migration 050: Loại bỏ 'essay' khỏi CHECK constraint của exam_type và question_type
-- Hệ thống chỉ hỗ trợ thi trắc nghiệm (MCQ). Tự luận (essay) không còn được sử dụng.

-- ============================================================
-- 1. Cập nhật dữ liệu: chuyển đổi mọi row essay sang mcq
--    (phòng trường hợp có dữ liệu cũ vẫn còn 'essay')
-- ============================================================
UPDATE exams
SET exam_type = 'mcq'
WHERE exam_type = 'essay';

UPDATE questions
SET question_type = 'mcq'
WHERE question_type = 'essay';

UPDATE question_bank
SET question_type = 'mcq'
WHERE question_type = 'essay';

-- ============================================================
-- 2. Bảng exams — thay CHECK constraint trên cột exam_type
--    PostgreSQL không hỗ trợ sửa CHECK trực tiếp, phải drop rồi add lại.
-- ============================================================

-- Drop tất cả CHECK constraint có tên chứa 'exam_type' trên bảng exams
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'exams'::regclass
      AND contype = 'c'
      AND conname ILIKE '%exam_type%'
  LOOP
    EXECUTE format('ALTER TABLE exams DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

-- Trường hợp CHECK được nhúng inline khi tạo bảng (không có tên riêng),
-- cũng drop constraint không tên theo pg_get_constraintdef
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'exams'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%essay%'
      AND pg_get_constraintdef(oid) ILIKE '%exam_type%'
  LOOP
    EXECUTE format('ALTER TABLE exams DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

-- Thêm lại CHECK constraint chỉ cho phép 'mcq'
ALTER TABLE exams
  ADD CONSTRAINT exams_exam_type_check CHECK (exam_type IN ('mcq'));

-- ============================================================
-- 3. Bảng questions — thay CHECK constraint trên cột question_type
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'questions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%essay%'
      AND pg_get_constraintdef(oid) ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

ALTER TABLE questions
  ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('mcq'));

-- ============================================================
-- 4. Bảng question_bank — thay CHECK constraint trên cột question_type
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'question_bank'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%essay%'
      AND pg_get_constraintdef(oid) ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

ALTER TABLE question_bank
  ADD CONSTRAINT question_bank_question_type_check CHECK (question_type IN ('mcq'));
