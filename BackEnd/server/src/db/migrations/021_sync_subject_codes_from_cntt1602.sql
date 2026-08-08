-- Chuẩn hóa mã môn + category/sub_category theo danh mục Phenikaa Uni CNTT1602
-- ============================================================
-- KHỐI A: Giáo dục đại cương
-- ============================================================
UPDATE subjects SET code = 'FFS702005', category = 'general_ed', sub_category = 'politics'
WHERE name ILIKE '%Lịch sử Đảng cộng sản Việt Nam%';

UPDATE subjects SET code = 'FFS703010', category = 'foundation', sub_category = 'math'
WHERE name ILIKE '%Lý thuyết xác suất thống kê%';

UPDATE subjects SET code = 'FFS703007', category = 'foundation', sub_category = 'math'
WHERE name ILIKE '%Đại số tuyến tính%';

UPDATE subjects SET code = 'FFS702004', category = 'general_ed', sub_category = 'politics'
WHERE name ILIKE '%Chủ nghĩa xã hội khoa học%';

UPDATE subjects SET code = 'CSE702116', category = 'foundation', sub_category = 'ai_iot'
WHERE name ILIKE '%Khoa học dữ liệu và trí tuệ nhân tạo%';

UPDATE subjects SET code = 'FFS702003', category = 'general_ed', sub_category = 'politics'
WHERE name ILIKE '%Kinh tế chính trị Mác%';

UPDATE subjects SET code = 'CSE703024', category = 'foundation', sub_category = 'math'
WHERE name ILIKE '%Toán rời rạc%';

UPDATE subjects SET code = 'FFS703002', category = 'general_ed', sub_category = 'philosophy'
WHERE name ILIKE '%Triết học Mác%';

UPDATE subjects SET code = 'FFS703013', category = 'foundation', sub_category = 'math'
WHERE name ILIKE '%Vật lý 1%';

UPDATE subjects SET code = 'FFS702001', category = 'general_ed', sub_category = 'law'
WHERE name ILIKE '%Pháp luật đại cương%';

UPDATE subjects SET code = 'FEL703001', category = 'foundation', sub_category = 'english'
WHERE name ILIKE '%Tiếng Anh 1%';

UPDATE subjects SET code = 'FFS703008', category = 'foundation', sub_category = 'math'
WHERE name ILIKE '%Giải tích%';

UPDATE subjects SET code = 'FFS702006', category = 'general_ed', sub_category = 'philosophy'
WHERE name ILIKE '%Tư tưởng Hồ Chí Minh%';

-- ============================================================
-- KHỐI B: Kiến thức cơ sở ngành
-- ============================================================
UPDATE subjects SET code = 'CSE703118', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 1%';

UPDATE subjects SET code = 'CSE703006', category = 'foundation', sub_category = 'programming'
WHERE name ILIKE '%Cấu trúc dữ liệu và thuật toán%';

UPDATE subjects SET code = 'CSE703124', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 7%';

UPDATE subjects SET code = 'CSE703064', category = 'software_eng', sub_category = 'web'
WHERE name ILIKE '%Xây dựng ứng dụng web%';

UPDATE subjects SET code = 'CSE703122', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 5%';

UPDATE subjects SET code = 'CSE703123', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 6%';

UPDATE subjects SET code = 'CSE703004', category = 'security', sub_category = 'security'
WHERE name ILIKE '%An toàn và bảo mật thông tin%';

UPDATE subjects SET code = 'CSE702011', category = 'foundation', sub_category = 'network'
WHERE name ILIKE '%Điện toán đám mây%';

UPDATE subjects SET code = 'CSE702017', category = 'foundation', sub_category = 'os'
WHERE name ILIKE '%Hệ điều hành%';

UPDATE subjects SET code = 'CSE702040', category = 'foundation', sub_category = 'intro'
WHERE name ILIKE '%Nhập môn Công nghệ thông tin%';

UPDATE subjects SET code = 'CSE703125', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 8%';

UPDATE subjects SET code = 'CSE702128', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật chuyên ngành IT1%';

UPDATE subjects SET code = 'CSE703023', category = 'foundation', sub_category = 'hardware'
WHERE name ILIKE '%Kiến trúc máy tính%';

UPDATE subjects SET code = 'CSE703038', category = 'foundation', sub_category = 'programming'
WHERE name ILIKE '%Ngôn ngữ lập trình C%' AND name NOT ILIKE '%nâng cao%';

UPDATE subjects SET code = 'CSE703008', category = 'foundation', sub_category = 'database'
WHERE name ILIKE '%Cơ sở dữ liệu%';

UPDATE subjects SET code = 'CSE703119', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 2%';

UPDATE subjects SET code = 'EEE703044', category = 'foundation', sub_category = 'hardware'
WHERE name ILIKE '%Kỹ thuật số%';

UPDATE subjects SET code = 'CSE703120', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 3%';

UPDATE subjects SET code = 'CSE702025', category = 'software_eng', sub_category = 'se'
WHERE name ILIKE '%Kỹ thuật phần mềm%';

UPDATE subjects SET code = 'CSE703121', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật IT 4%';

UPDATE subjects SET code = 'CSE703029', category = 'foundation', sub_category = 'programming'
WHERE name ILIKE '%Lập trình hướng đối tượng%';

UPDATE subjects SET code = 'CSE702036', category = 'foundation', sub_category = 'network'
WHERE name ILIKE '%Mạng máy tính%';

UPDATE subjects SET code = 'EEE703068', category = 'ai_ml', sub_category = 'cv'
WHERE name ILIKE '%Thị giác máy tính%';

-- ============================================================
-- KHỐI C: Bổ trợ
-- ============================================================
UPDATE subjects SET code = 'CSE702129', category = 'foundation', sub_category = 'japanese'
WHERE name ILIKE '%Tiếng Nhật chuyên ngành IT2%';

UPDATE subjects SET code = 'FBE702001', category = 'skills_support', sub_category = 'business'
WHERE name ILIKE '%Quản trị học%';

UPDATE subjects SET code = 'FTS702001', category = 'skills_support', sub_category = 'soft_skills'
WHERE name ILIKE '%Kỹ năng khởi nghiệp%';

UPDATE subjects SET code = 'FTS702004', category = 'skills_support', sub_category = 'soft_skills'
WHERE name ILIKE '%Kỹ năng tư duy sáng tạo%';

UPDATE subjects SET code = 'FTS702003', category = 'skills_support', sub_category = 'soft_skills'
WHERE name ILIKE '%Kỹ năng đàm phán%';

UPDATE subjects SET code = 'FTS702002', category = 'skills_support', sub_category = 'soft_skills'
WHERE name ILIKE '%Kỹ năng quản lý dự án%';

-- ============================================================
-- KHỐI D: Chuyên ngành
-- ============================================================
UPDATE subjects SET code = 'CSE703048', category = 'software_eng', sub_category = 'design'
WHERE name ILIKE '%Phân tích và thiết kế phần mềm%';

UPDATE subjects SET code = 'CSE702027', category = 'software_eng', sub_category = 'mobile'
WHERE name ILIKE '%Lập trình cho thiết bị di động%';

UPDATE subjects SET code = 'CSE702051', category = 'software_eng', sub_category = 'web'
WHERE name ILIKE '%Thiết kế web nâng cao%';

UPDATE subjects SET code = 'CSE703010', category = 'software_eng', sub_category = 'testing'
WHERE name ILIKE '%Đánh giá và kiểm định chất lượng phần mềm%';

UPDATE subjects SET code = 'CSE702022', category = 'ai_ml', sub_category = 'data_mining'
WHERE name ILIKE '%Khai phá dữ liệu%';

UPDATE subjects SET code = 'CSE703065', category = 'ai_ml', sub_category = 'nlp'
WHERE name ILIKE '%Xử lý ngôn ngữ tự nhiên%';

UPDATE subjects SET code = 'CSE702060', category = 'ai_ml', sub_category = 'viz'
WHERE name ILIKE '%Trực quan hoá dữ liệu%';

UPDATE subjects SET code = 'CSE702049', category = 'software_eng', sub_category = 'pm'
WHERE name ILIKE '%Quản trị dự án công nghệ thông tin%';

UPDATE subjects SET code = 'CSE703054', category = 'ai_ml', sub_category = 'big_data'
WHERE name ILIKE '%Tích hợp và phân tích dữ liệu lớn%';

UPDATE subjects SET code = 'CSE703016', category = 'software_eng', sub_category = 'hci'
WHERE name ILIKE '%Giao diện người máy%';

UPDATE subjects SET code = 'CSE703037', category = 'ai_ml', sub_category = 'dl'
WHERE name ILIKE '%Mạng nơron và học sâu%';

UPDATE subjects SET code = 'CSE703015', category = 'ai_ml', sub_category = 'graphics'
WHERE name ILIKE '%Đồ hoạ máy tính%';

UPDATE subjects SET code = 'CSE703032', category = 'foundation', sub_category = 'parallel'
WHERE name ILIKE '%Lập trình song song%';

UPDATE subjects SET code = 'CSE702033', category = 'software_eng', sub_category = 'gaming'
WHERE name ILIKE '%Lập trình trò chơi%';

UPDATE subjects SET code = 'CSE703018', category = 'foundation', sub_category = 'embedded'
WHERE name ILIKE '%Hệ nhúng%';

UPDATE subjects SET code = 'CSE703132', category = 'foundation', sub_category = 'programming'
WHERE name ILIKE '%Lập trình C nâng cao%';

UPDATE subjects SET code = 'CSE703130', category = 'software_eng', sub_category = 'java'
WHERE name ILIKE '%Công nghệ Java%';

UPDATE subjects SET code = 'CSE702043', category = 'ai_ml', sub_category = 'data_analysis'
WHERE name ILIKE '%Phân tích dữ liệu%' AND name NOT ILIKE '%lập trình%';

UPDATE subjects SET code = 'CSE703007', category = 'foundation', sub_category = 'compiler'
WHERE name ILIKE '%Chương trình dịch%';

UPDATE subjects SET code = 'CSE702031', category = 'ai_ml', sub_category = 'python'
WHERE name ILIKE '%Lập trình phân tích dữ liệu với python%';

UPDATE subjects SET code = 'CSE703009', category = 'software_eng', sub_category = 'dotnet'
WHERE name ILIKE '%Công nghệ .Net%';

UPDATE subjects SET code = 'CSE702046', category = 'skills_support', sub_category = 'business'
WHERE name ILIKE '%Phân tích nghiệp vụ kinh doanh%';

UPDATE subjects SET code = 'CSE702063', category = 'software_eng', sub_category = 'distributed'
WHERE name ILIKE '%Ứng dụng phân tán%';

UPDATE subjects SET code = 'CSE702005', category = 'security', sub_category = 'app_security'
WHERE name ILIKE '%Bảo mật ứng dụng và hệ thống%';

-- ============================================================
-- KHỐI E: Thực tập
-- ============================================================
UPDATE subjects SET code = 'CSE702053', category = 'internship', sub_category = 'industry'
WHERE name ILIKE '%Thực tập công nghiệp%';

UPDATE subjects SET code = 'CSE704067', category = 'internship', sub_category = 'capstone'
WHERE name ILIKE '%Thực tập tốt nghiệp%';

UPDATE subjects SET code = 'CSE703014', category = 'internship', sub_category = 'project'
WHERE name ILIKE '%Đồ án liên ngành%';

UPDATE subjects SET code = 'CSE702131', category = 'internship', sub_category = 'project'
WHERE name ILIKE '%Đồ án cơ sở Công nghệ Thông tin%';

UPDATE subjects SET code = 'CSE710068', category = 'internship', sub_category = 'thesis'
WHERE name ILIKE '%Đồ án tốt nghiệp%';

-- ============================================================
-- KHỐI F: Quốc phòng & Thể chất & Điều kiện
-- ============================================================
UPDATE subjects SET code = 'FFS708066', category = 'general_ed', sub_category = 'defense'
WHERE name ILIKE '%Giáo dục quốc phòng - an ninh%';

UPDATE subjects SET code = 'FFS701072', category = 'pe', sub_category = 'pe'
WHERE name ILIKE '%Chạy 1%';

UPDATE subjects SET code = 'FFS701073', category = 'pe', sub_category = 'pe'
WHERE name ILIKE '%Aerobic%';

UPDATE subjects SET code = 'FFS701068', category = 'pe', sub_category = 'pe'
WHERE name ILIKE '%Bóng chuyền%';

UPDATE subjects SET code = 'FFS701069', category = 'pe', sub_category = 'pe'
WHERE name ILIKE '%Bóng đá%';

UPDATE subjects SET code = 'FFS701070', category = 'pe', sub_category = 'pe'
WHERE name ILIKE '%Cầu lông%';

UPDATE subjects SET code = 'FFS701067', category = 'pe', sub_category = 'pe'
WHERE name ILIKE '%Bóng rổ%';

UPDATE subjects SET code = 'FEL704000', category = 'foundation', sub_category = 'english'
WHERE name ILIKE '%Tiếng Anh bổ trợ%';

-- Fallback: còn môn chưa có mã thì tự sinh
UPDATE subjects SET code = COALESCE(NULLIF(TRIM(code), ''), 'SUBJ-' || LEFT(id::text, 8))
WHERE code IS NULL OR TRIM(code) = '';
