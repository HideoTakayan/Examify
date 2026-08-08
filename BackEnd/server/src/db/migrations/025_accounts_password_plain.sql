-- Lưu mật khẩu hiển thị cho GV quản lý lớp (không dùng cho xác thực; auth vẫn dùng hashed_password)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_plain TEXT;

UPDATE accounts
SET password_plain = 'Test@123'
WHERE role = 'student' AND password_plain IS NULL;
