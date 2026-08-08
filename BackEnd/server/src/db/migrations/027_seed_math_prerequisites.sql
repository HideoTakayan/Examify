-- Tiên quyết Toán (có thể sửa qua admin API sau)
UPDATE subjects t
SET prerequisites = ARRAY(
  SELECT s.id FROM subjects s
  WHERE s.name ILIKE 'Đại số tuyến tính%'
     OR s.name = 'Toán giải tích'
)
WHERE t.name = 'Toán rời rạc'
  AND EXISTS (SELECT 1 FROM subjects s WHERE s.name ILIKE 'Đại số tuyến tính%')
  AND EXISTS (SELECT 1 FROM subjects s WHERE s.name = 'Toán giải tích');

UPDATE subjects t
SET prerequisites = ARRAY(
  SELECT s.id FROM subjects s
  WHERE s.name ILIKE 'Đại số tuyến tính%'
     OR s.name = 'Toán giải tích'
     OR s.name = 'Toán rời rạc'
)
WHERE t.name ILIKE 'Xác suất thống kê%'
  AND EXISTS (SELECT 1 FROM subjects s WHERE s.name = 'Toán rời rạc');
