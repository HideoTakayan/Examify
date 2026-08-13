-- Thêm cột section_name (Tên lớp/nhóm) vào term_subject_offerings
ALTER TABLE term_subject_offerings 
  ADD COLUMN IF NOT EXISTS section_name TEXT NOT NULL DEFAULT 'N01';

-- Xoá constraint cũ (semester_id, subject_id)
ALTER TABLE term_subject_offerings 
  DROP CONSTRAINT IF EXISTS term_subject_offerings_semester_id_subject_id_key;

-- Tạo constraint mới cho phép 1 môn mở nhiều lớp trong 1 kỳ
ALTER TABLE term_subject_offerings 
  ADD CONSTRAINT term_subject_offerings_semester_subject_section_key UNIQUE (semester_id, subject_id, section_name);
