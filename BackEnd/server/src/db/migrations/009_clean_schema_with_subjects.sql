-- =============================================================================
-- CLEAN DATABASE — CNTT Online Exam System
-- Chạy toàn bộ script này trên pgAdmin (Neon PostgreSQL)
-- Keep: accounts (login), subjects (52 môn DEMO-CLASS)
-- =============================================================================

-- 1. DROP tất cả bảng theo thứ tự FK → PK
DROP TABLE IF EXISTS exam_session_autosaves      CASCADE;
DROP TABLE IF EXISTS exam_integrity_events        CASCADE;
DROP TABLE IF EXISTS exam_deadline_notifications  CASCADE;
DROP TABLE IF EXISTS exams                        CASCADE;
DROP TABLE IF EXISTS questions                   CASCADE;
DROP TABLE IF EXISTS exam_sessions               CASCADE;
DROP TABLE IF EXISTS enrollments                 CASCADE;
DROP TABLE IF EXISTS classes                      CASCADE;
DROP TABLE IF EXISTS subjects                    CASCADE;
DROP TABLE IF EXISTS user_sessions               CASCADE;
DROP TABLE IF EXISTS accounts                    CASCADE;
DROP EXTENSION IF EXISTS "pgcrypto";

-- =============================================================================
-- 2. ACCOUNTS (GIỮ NGUYÊN — để login)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email     ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_username  ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_role       ON accounts(role);

-- =============================================================================
-- 3. SUBJECTS — Bảng môn học (DEMO CLASS, 52 môn)
-- =============================================================================
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    credits DECIMAL(4,1) NOT NULL DEFAULT 0,
    semester INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'general',
    prerequisites UUID[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_name      ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_semester  ON subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_category  ON subjects(category);

-- =============================================================================
-- 4. CLASSES — Lớp học (liên kết subject → teacher)
-- =============================================================================
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_subject ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- =============================================================================
-- 5. ENROLLMENTS — Sinh viên đăng ký lớp
-- =============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class  ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

-- =============================================================================
-- 6. EXAMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    duration_min INTEGER NOT NULL,
    closes_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_class      ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_closes_at  ON exams(closes_at);

-- =============================================================================
-- 7. QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'essay')),
    options JSONB,
    correct_answer JSONB,
    points DECIMAL(4,1) NOT NULL DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);

-- =============================================================================
-- 8. EXAM SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    score DECIMAL(6,2),
    max_points DECIMAL(6,2),
    student_answers JSONB,
    graded_details JSONB,
    grading_status TEXT DEFAULT 'pending_manual' CHECK (grading_status IN ('pending_manual', 'complete')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_exam    ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON exam_sessions(status);

-- =============================================================================
-- 9. EXAM AUTOSAVES
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_session_autosaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL,
    server_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autosaves_session ON exam_session_autosaves(session_id);
CREATE INDEX IF NOT EXISTS idx_autosaves_exam    ON exam_session_autosaves(exam_id);

-- =============================================================================
-- 10. EXAM INTEGRITY EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_integrity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_exam    ON exam_integrity_events(exam_id);
CREATE INDEX IF NOT EXISTS idx_integrity_session ON exam_integrity_events(session_id);

-- =============================================================================
-- 11. EXAM DEADLINE NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS exam_deadline_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'reminder',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_exam    ON exam_deadline_notifications(exam_id);
CREATE INDEX IF NOT EXISTS idx_notif_student ON exam_deadline_notifications(student_id);

-- =============================================================================
-- 12. USER SESSIONS (multi-device)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_info TEXT,
    token_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash  ON user_sessions(token_hash);

-- =============================================================================
-- 13. INSERT 52 MÔN HỌC DEMO CLASS
-- =============================================================================
INSERT INTO subjects (name, code, credits, semester, category) VALUES
('Lịch sử Đảng cộng sản Việt Nam', 'FFS702005', 2.0, 1, 'general'),
('Lý thuyết xác suất thống kê', 'FFS703010', 3.0, 1, 'general'),
('Đại số tuyến tính', 'FFS703007', 3.0, 1, 'general'),
('Chủ nghĩa xã hội khoa học', 'FFS702004', 2.0, 1, 'general'),
('Khoa học dữ liệu và trí tuệ nhân tạo', 'CSE702116', 2.0, 1, 'general'),
('Kinh tế chính trị Mác - Lênin', 'FFS702003', 2.0, 1, 'general'),
('Toán rời rạc', 'CSE703024', 3.0, 1, 'general'),
('Triết học Mác - Lê nin', 'FFS703002', 3.0, 1, 'general'),
('Vật lý 1', 'FFS703013', 3.0, 1, 'general'),
('Pháp luật đại cương', 'FFS702001', 2.0, 1, 'general'),
('Tiếng Anh 1', 'FEL703001', 3.0, 1, 'general'),
('Giải tích', 'FFS703008', 3.0, 1, 'general'),
('Tư tưởng Hồ Chí Minh', 'FFS702006', 2.0, 1, 'general'),
('Tiếng Nhật IT 1', 'CSE703118', 3.0, 1, 'general'),
('Cấu trúc dữ liệu và thuật toán', 'CSE703006', 3.0, 1, 'general'),
('Tiếng Nhật IT 7', 'CSE703124', 3.0, 1, 'general'),
('Xây dựng ứng dụng web', 'CSE703064', 3.0, 1, 'general'),
('Tiếng Nhật IT 5', 'CSE703122', 3.0, 1, 'general'),
('Tiếng Nhật IT 6', 'CSE703123', 3.0, 1, 'general'),
('An toàn và bảo mật thông tin', 'CSE703004', 3.0, 1, 'general'),
('Điện toán đám mây', 'CSE702011', 2.0, 1, 'general'),
('Hệ điều hành', 'CSE702017', 2.0, 1, 'general'),
('Nhập môn Công nghệ thông tin', 'CSE702040', 2.0, 1, 'general'),
('Tiếng Nhật IT 8', 'CSE703125', 3.0, 1, 'general'),
('Tiếng Nhật chuyên ngành IT1', 'CSE702128', 2.0, 1, 'general'),
('Kiến trúc máy tính', 'CSE703023', 3.0, 1, 'general'),
('Ngôn ngữ lập trình C', 'CSE703038', 3.0, 1, 'general'),
('Cơ sở dữ liệu', 'CSE703008', 3.0, 1, 'general'),
('Tiếng Nhật IT 2', 'CSE703119', 3.0, 1, 'general'),
('Kỹ thuật số', 'EEE703044', 3.0, 1, 'general'),
('Tiếng Nhật IT 3', 'CSE703120', 3.0, 1, 'general'),
('Kỹ thuật phần mềm', 'CSE702025', 2.0, 1, 'general'),
('Tiếng Nhật IT 4', 'CSE703121', 3.0, 1, 'general'),
('Lập trình hướng đối tượng', 'CSE703029', 3.0, 1, 'general'),
('Mạng máy tính', 'CSE702036', 2.0, 1, 'general'),
('Thị giác máy tính', 'EEE703068', 3.0, 1, 'general'),
('Tiếng Nhật chuyên ngành IT2', 'CSE702129', 2.0, 1, 'general'),
('Quản trị học', 'FBE702001', 2.0, 1, 'general'),
('Kỹ năng khởi nghiệp và lãnh đạo', 'FTS702001', 2.0, 1, 'general'),
('Kỹ năng tư duy sáng tạo và phản biện', 'FTS702004', 2.0, 1, 'general'),
('Kỹ năng đàm phán, thương lượng', 'FTS702003', 2.0, 1, 'general'),
('Kỹ năng quản lý dự án', 'FTS702002', 2.0, 1, 'general'),
('Phân tích và thiết kế phần mềm', 'CSE703048', 3.0, 1, 'general'),
('Lập trình cho thiết bị di động', 'CSE702027', 2.0, 1, 'general'),
('Thiết kế web nâng cao', 'CSE702051', 2.0, 1, 'general'),
('Đánh giá và kiểm định chất lượng phần mềm*', 'CSE703010', 3.0, 1, 'general'),
('Khai phá dữ liệu', 'CSE702022', 2.0, 1, 'general'),
('Xử lý ngôn ngữ tự nhiên', 'CSE703065', 3.0, 1, 'general'),
('Trực quan hoá dữ liệu', 'CSE702060', 2.0, 1, 'general'),
('Quản trị dự án công nghệ thông tin', 'CSE702049', 2.0, 1, 'general'),
('Tích hợp và phân tích dữ liệu lớn', 'CSE703054', 3.0, 1, 'general'),
('Giao diện người máy', 'CSE703016', 3.0, 1, 'general'),
('Mạng nơron và học sâu', 'CSE703037', 3.0, 1, 'general'),
('Đồ hoạ máy tính và thực tế ảo', 'CSE703015', 3.0, 1, 'general'),
('Lập trình song song', 'CSE703032', 3.0, 1, 'general'),
('Lập trình trò chơi', 'CSE702033', 2.0, 1, 'general'),
('Hệ nhúng', 'CSE703018', 3.0, 1, 'general'),
('Lập trình C nâng cao', 'CSE703132', 3.0, 1, 'general'),
('Công nghệ Java', 'CSE703130', 3.0, 1, 'general'),
('Phân tích dữ liệu', 'CSE702043', 2.0, 1, 'general'),
('Chương trình dịch', 'CSE703007', 3.0, 1, 'general'),
('Lập trình phân tích dữ liệu với python', 'CSE702031', 2.0, 1, 'general'),
('Công nghệ .Net', 'CSE703009', 3.0, 1, 'general'),
('Phân tích nghiệp vụ kinh doanh', 'CSE702046', 2.0, 1, 'general'),
('Ứng dụng phân tán*', 'CSE702063', 2.0, 1, 'general'),
('Bảo mật ứng dụng và hệ thống', 'CSE702005', 2.0, 1, 'general'),
('Thực tập công nghiệp', 'CSE702053', 2.0, 1, 'general'),
('Thực tập tốt nghiệp', 'CSE704067', 4.0, 1, 'general'),
('Đồ án liên ngành', 'CSE703014', 3.0, 1, 'general'),
('Đồ án cơ sở Công nghệ Thông tin', 'CSE702131', 2.0, 1, 'general'),
('Đồ án tốt nghiệp', 'CSE710068', 10.0, 1, 'general'),
('Giáo dục quốc phòng - an ninh', 'FFS708066', 8.0, 1, 'general'),
('Chạy 1', 'FFS701072', 1.0, 1, 'general'),
('Aerobic', 'FFS701073', 1.0, 1, 'general'),
('Bóng chuyền', 'FFS701068', 1.0, 1, 'general'),
('Bóng đá', 'FFS701069', 1.0, 1, 'general'),
('Cầu lông', 'FFS701070', 1.0, 1, 'general'),
('Bóng rổ', 'FFS701067', 1.0, 1, 'general'),
('Tiếng Anh bổ trợ', 'FEL704000', 4.0, 1, 'general')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 14. INSERT SEED ACCOUNTS
-- Password tất cả: Test@123
-- =============================================================================
INSERT INTO accounts (email, username, hashed_password, role, full_name) VALUES
('admin01@phenikaa-uni.edu.vn', 'admin01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJah0mFSeN3cGpJLHLDvE1Ly', 'admin', 'Quản trị viên 01'),
('mai.xuan.trang@phenikaa-uni.edu.vn', 'mai.xuan.trang', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJah0mFSeN3cGpJLHLDvE1Ly', 'teacher', 'Mai Xuân Trang'),
('student01@st.phenikaa-uni.edu.vn', 'student01', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJah0mFSeN3cGpJLHLDvE1Ly', 'student', 'Sinh viên 01')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 15. MIGRATION TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO _migrations (name) VALUES ('009_clean_schema_with_subjects')
ON CONFLICT (name) DO NOTHING;
