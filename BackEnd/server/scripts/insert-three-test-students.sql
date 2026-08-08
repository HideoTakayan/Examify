-- 3 tài khoản test (role student), mật khẩu: Test@123
-- Hash bcrypt cost 12 cho chuỗi "Test@123" (đã verify bằng bcrypt.compare).
-- Nếu cần mật khẩu khác: chạy trong thư mục server:
--   node -e "require('bcrypt').hash('MatKhauMoi',12).then(console.log)"
-- rồi thay chuỗi hashed_password bên dưới.

INSERT INTO accounts (email, username, hashed_password, role, full_name, is_active)
VALUES
  (
    'sv13@system.local',
    'sv13',
    '$2b$12$X.8wKITURkGWHnDhcrkfKO1EZFdOUlri9qf4FR7Gi3.9ususgEZxu',
    'student',
    'Sinh viên test 13',
    true
  ),
  (
    'sv14@system.local',
    'sv14',
    '$2b$12$X.8wKITURkGWHnDhcrkfKO1EZFdOUlri9qf4FR7Gi3.9ususgEZxu',
    'student',
    'Sinh viên test 14',
    true
  ),
  (
    'sv15@system.local',
    'sv15',
    '$2b$12$X.8wKITURkGWHnDhcrkfKO1EZFdOUlri9qf4FR7Gi3.9ususgEZxu',
    'student',
    'Sinh viên test 15',
    true
  )
ON CONFLICT (email) DO UPDATE SET
  hashed_password = EXCLUDED.hashed_password,
  username      = EXCLUDED.username,
  full_name     = EXCLUDED.full_name,
  is_active     = EXCLUDED.is_active,
  updated_at    = NOW();
