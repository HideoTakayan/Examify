-- Vô hiệu hóa JWT cũ khi đổi / reset mật khẩu (so khớp claim `tv` trong token).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
