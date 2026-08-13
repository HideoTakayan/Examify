import dotenv from "dotenv";

dotenv.config();

/** Danh sách origin được phép gọi API + Socket.IO (CORS). Phân tách bằng dấu phẩy. */
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [
    "http://localhost:5173",
    "https://exam.local",
  ];
}

function parseBool(raw: string | undefined, defaultVal: boolean): boolean {
  if (raw === undefined || raw === "") return defaultVal;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function parseIntEnv(raw: string | undefined, defaultVal: number): number {
  const n = raw !== undefined && raw !== "" ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : defaultVal;
}

export const env = {
  APP_PORT: process.env.APP_PORT || process.env.PORT || 5000,
  APP_HOST: process.env.APP_HOST || "localhost",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "change_this_to_strong_secret",
  /** Thời hạn phiên đăng nhập (JWT + user_sessions.expires_at). Mặc định 24 giờ. */
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
  AUTHOR: process.env.AUTHOR || "Examify",
  /** Dùng chung cho Express `cors` và Socket.IO */
  CORS_ORIGINS: parseCorsOrigins(),
  /** SMTP — để job nhắc hạn thi gửi email (tùy chọn). */
  SMTP_HOST: process.env.SMTP_HOST?.trim() || "",
  SMTP_PORT: parseIntEnv(process.env.SMTP_PORT, 587),
  SMTP_SECURE: parseBool(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER?.trim() || "",
  SMTP_PASS: process.env.SMTP_PASS?.trim() || "",
  MAIL_FROM: process.env.MAIL_FROM?.trim() || "",
  /** Resend HTTPS API — dùng trên Render Free (SMTP port bị chặn). */
  RESEND_API_KEY: process.env.RESEND_API_KEY?.trim() || "",
  /** Chu kỳ quét nhắc hạn thi (ms), mặc định 10 phút */
  EXAM_REMINDER_INTERVAL_MS: parseIntEnv(process.env.EXAM_REMINDER_INTERVAL_MS, 600_000),
  /** Cloudinary upload (cloudinary://<key>:<secret>@<cloud>) */
  CLOUDINARY_URL: process.env.CLOUDINARY_URL?.trim() || "",
  /** Cleanup media uploaded only for preview/import but never saved. */
  CLOUDINARY_PREVIEW_CLEANUP_INTERVAL_MS: parseIntEnv(
    process.env.CLOUDINARY_PREVIEW_CLEANUP_INTERVAL_MS,
    60 * 60 * 1000
  ),
  CLOUDINARY_PREVIEW_MAX_AGE_MS: parseIntEnv(
    process.env.CLOUDINARY_PREVIEW_MAX_AGE_MS,
    24 * 60 * 60 * 1000
  ),
};