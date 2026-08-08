-- Bật bắt buộc đổi mật khẩu khi đăng nhập lần tiếp theo (luồng: email MK tạm → đăng nhập → đổi MK).
-- Áp dụng mọi dòng trong bảng accounts đang hoạt động.
-- Role admin: UI đăng nhập vẫn bỏ qua first_login (không bị chuyển /change-password-required).
UPDATE accounts
SET first_login = true,
    updated_at = NOW()
WHERE is_active = true;
