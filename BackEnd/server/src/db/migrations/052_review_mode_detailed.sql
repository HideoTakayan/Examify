-- Migration: Add review_mode_detailed column to exams table
-- Cho phép giáo viên cấu hình sinh viên có xem được đáp án chi tiết sau khi thi hay không
-- Chỉ có hiệu lực với bài thi thử (practice). Giữa kỳ và cuối kỳ luôn là false.

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS review_mode_detailed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN exams.review_mode_detailed IS 
  'Nếu true, sinh viên có thể xem chi tiết đáp án sau khi nộp bài. Chỉ áp dụng cho bài thi thử (practice). Giữa kỳ và cuối kỳ luôn là false.';
