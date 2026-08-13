-- Thêm hình thức thi: mcq (Trắc nghiệm trực tuyến) hoặc essay (Tự luận / Nhập điểm ngoại tuyến)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL DEFAULT 'mcq' CHECK (exam_type IN ('mcq', 'essay'));

-- Nới lỏng các trường bắt buộc của bài thi trực tuyến đối với bài thi tự luận
ALTER TABLE exams ALTER COLUMN duration_min DROP NOT NULL;

-- Cập nhật lại những bài thi hiện có
UPDATE exams SET exam_type = 'mcq' WHERE exam_type IS NULL;
