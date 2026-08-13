-- Migration 053: Cập nhật constraint của exam_type và question_type để hỗ trợ các loại câu hỏi mới
-- MSQ: Trắc nghiệm nhiều đáp án (Multiple Select Question)
-- FIB: Điền từ vào chỗ trống (Fill in the blanks)

-- ============================================================
-- 1. Bảng exams — Drop CHECK constraint hiện tại và thêm mới
-- ============================================================

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

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'exams'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%exam_type%'
  LOOP
    EXECUTE format('ALTER TABLE exams DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

-- Thêm constraint mới cho phép mcq, msq, fib
ALTER TABLE exams ADD CONSTRAINT exams_exam_type_check CHECK (exam_type IN ('mcq', 'msq', 'fib', 'mixed'));

-- ============================================================
-- 2. Bảng questions — Drop CHECK constraint hiện tại và thêm mới
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
      AND conname ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'questions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE questions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

-- Thêm constraint mới
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('mcq', 'msq', 'fib'));

-- ============================================================
-- 3. Bảng question_bank — Drop CHECK constraint hiện tại và thêm mới
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
      AND conname ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'question_bank'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%question_type%'
  LOOP
    EXECUTE format('ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

ALTER TABLE question_bank ADD CONSTRAINT question_bank_question_type_check CHECK (question_type IN ('mcq', 'msq', 'fib'));
