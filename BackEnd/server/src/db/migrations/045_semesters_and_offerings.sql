-- Migration script generated
-- Bảng Semesters và Cập nhật Subject

CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ 1 học kỳ được active (is_current)
CREATE UNIQUE INDEX IF NOT EXISTS idx_semesters_current ON semesters (is_current) WHERE is_current = true;

CREATE TABLE IF NOT EXISTS term_subject_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(semester_id, subject_id)
);

CREATE TABLE IF NOT EXISTS term_teacher_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_offering_id UUID NOT NULL REFERENCES term_subject_offerings(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(term_offering_id, teacher_id)
);

ALTER TABLE subjects 
  ADD COLUMN IF NOT EXISTS credits DECIMAL(4,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS theory_hours DECIMAL(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS practice_hours DECIMAL(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_semester TEXT;

UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '1' WHERE code = 'FFS703007';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '1' WHERE code = 'FFS702001';
UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '2' WHERE code = 'FFS703010';
UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '2' WHERE code = 'CSE703024';
UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '2' WHERE code = 'FFS703002';
UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '3' WHERE code = 'FFS703008';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '3' WHERE code = 'CSE702116';
UPDATE subjects SET credits = 3, theory_hours = 15, practice_hours = 60, expected_semester = '3' WHERE code = 'FEL703001';
UPDATE subjects SET credits = 3, theory_hours = 37.5, practice_hours = 15, expected_semester = '4' WHERE code = 'FFS703013';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '5' WHERE code = 'FFS702003';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '8' WHERE code = 'FFS702004';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '10' WHERE code = 'FFS702005';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '11' WHERE code = 'FFS702006';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '1' WHERE code = 'CSE703038';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '1' WHERE code = 'CSE702040';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '1' WHERE code = 'CSE703118';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '2' WHERE code = 'CSE703119';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '3' WHERE code = 'CSE703120';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '4' WHERE code = 'CSE703006';
UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '4' WHERE code = 'EEE703044';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '4' WHERE code = 'CSE702036';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '4' WHERE code = 'CSE703121';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '5' WHERE code = 'CSE703008';
UPDATE subjects SET credits = 2, theory_hours = 22.5, practice_hours = 15, expected_semester = '5' WHERE code = 'CSE702017';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '5' WHERE code = 'CSE703023';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '5' WHERE code = 'CSE703122';
UPDATE subjects SET credits = 2, theory_hours = 22.5, practice_hours = 15, expected_semester = '6' WHERE code = 'CSE702025';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '6' WHERE code = 'CSE703029';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '6' WHERE code = 'EEE703068';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '6' WHERE code = 'CSE703123';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '7' WHERE code = 'CSE702011';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '7' WHERE code = 'CSE703124';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '7' WHERE code = 'CSE703064';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '8' WHERE code = 'CSE703004';
UPDATE subjects SET credits = 2, theory_hours = 0, practice_hours = 60, expected_semester = '8' WHERE code = 'CSE702128';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '9' WHERE code = 'CSE703125';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '7' WHERE code = 'FBE702001';
UPDATE subjects SET credits = 2, theory_hours = 0, practice_hours = 60, expected_semester = '10' WHERE code = 'CSE702129';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '8' WHERE code = 'FTS702003';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '8' WHERE code = 'FTS702001';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '8' WHERE code = 'FTS702002';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '8' WHERE code = 'FTS702004';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '7' WHERE code = 'CSE703048';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '8' WHERE code = 'CSE702051';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '9' WHERE code = 'CSE703010';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '9' WHERE code = 'CSE702027';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '9' WHERE code = 'CSE702005';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '9' WHERE code = 'CSE702022';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '9' WHERE code = 'CSE702031';
UPDATE subjects SET credits = 2, theory_hours = 15, practice_hours = 30, expected_semester = '9' WHERE code = 'CSE702033';
UPDATE subjects SET credits = 2, theory_hours = 22.5, practice_hours = 15, expected_semester = '9' WHERE code = 'CSE702043';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '9' WHERE code = 'CSE702046';
UPDATE subjects SET credits = 2, theory_hours = 30, practice_hours = 0, expected_semester = '9' WHERE code = 'CSE702049';
UPDATE subjects SET credits = 2, theory_hours = 22.5, practice_hours = 15, expected_semester = '9' WHERE code = 'CSE702060';
UPDATE subjects SET credits = 2, theory_hours = 22.5, practice_hours = 15, expected_semester = '9' WHERE code = 'CSE702063';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703007';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703009';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703130';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703015';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703016';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703018';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703132';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703032';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703037';
UPDATE subjects SET credits = 3, theory_hours = 30, practice_hours = 30, expected_semester = '10' WHERE code = 'CSE703054';
UPDATE subjects SET credits = 3, theory_hours = 45, practice_hours = 0, expected_semester = '10' WHERE code = 'CSE703065';
UPDATE subjects SET credits = 2, theory_hours = 0, practice_hours = 60, expected_semester = NULL WHERE code = 'CSE702131';
UPDATE subjects SET credits = 3, theory_hours = 0, practice_hours = 90, expected_semester = '9' WHERE code = 'CSE703014';
UPDATE subjects SET credits = 2, theory_hours = 0, practice_hours = 60, expected_semester = '10' WHERE code = 'CSE702053';
UPDATE subjects SET credits = 4, theory_hours = 0, practice_hours = 120, expected_semester = '11' WHERE code = 'CSE704067';
UPDATE subjects SET credits = 10, theory_hours = 0, practice_hours = 300, expected_semester = '12' WHERE code = 'CSE710068';
UPDATE subjects SET credits = 8, theory_hours = 120, practice_hours = 0, expected_semester = '2' WHERE code = 'FFS708066';
UPDATE subjects SET credits = 1, theory_hours = 0, practice_hours = 30, expected_semester = '1' WHERE code = 'FFS701072';
UPDATE subjects SET credits = 1, theory_hours = 0, practice_hours = 30, expected_semester = '1' WHERE code = 'FFS701073';
UPDATE subjects SET credits = 1, theory_hours = 0, practice_hours = 30, expected_semester = '1' WHERE code = 'FFS701068';
UPDATE subjects SET credits = 1, theory_hours = 0, practice_hours = 30, expected_semester = '1' WHERE code = 'FFS701069';
UPDATE subjects SET credits = 1, theory_hours = 0, practice_hours = 30, expected_semester = '1' WHERE code = 'FFS701067';
UPDATE subjects SET credits = 1, theory_hours = 0, practice_hours = 30, expected_semester = '1' WHERE code = 'FFS701070';
UPDATE subjects SET credits = 4, theory_hours = 0, practice_hours = 120, expected_semester = '1' WHERE code = 'FEL704000';
UPDATE subjects SET credits = 0, theory_hours = 15, practice_hours = 0, expected_semester = NULL WHERE code = 'DT00001';
