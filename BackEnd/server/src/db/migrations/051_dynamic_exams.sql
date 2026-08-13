-- Migration 051: Hỗ trợ Đề Thi Động (Dynamic Exams)

-- Thêm cấu hình số lượng câu hỏi rút ngẫu nhiên (nếu NULL thì lấy tất cả)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS dynamic_num_questions INT NULL CHECK (dynamic_num_questions > 0);

-- Các cột cũ như `num_versions` vẫn giữ nguyên để tương thích ngược 
-- hoặc có thể bị bỏ lơ trong logic mới (sinh phiên bản đề ngẫu nhiên trên từng session).
