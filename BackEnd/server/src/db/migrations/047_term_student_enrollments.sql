-- Bảng danh sách sinh viên học từng lớp học phần (đợt mở môn)
CREATE TABLE IF NOT EXISTS term_student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_offering_id UUID NOT NULL REFERENCES term_subject_offerings(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(term_offering_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_term_student_enroll_offering ON term_student_enrollments(term_offering_id);
CREATE INDEX IF NOT EXISTS idx_term_student_enroll_student ON term_student_enrollments(student_id);
