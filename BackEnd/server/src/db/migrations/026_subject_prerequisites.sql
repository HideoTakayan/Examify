-- Môn học: phụ thuộc (prerequisites) cho dự đoán điểm / admin quản lý
COMMENT ON COLUMN subjects.prerequisites IS 'Danh sách môn tiên quyết (UUID) — cần có điểm/bài thi trước khi dự đoán môn này';

CREATE INDEX IF NOT EXISTS idx_subjects_prerequisites ON subjects USING GIN (prerequisites);

-- Gợi ý khối dự đoán (trùng sub_category / subject_groups)
COMMENT ON COLUMN subjects.sub_category IS 'Khối nhỏ: math, english, software_eng, … — dùng picker dự đoán';
