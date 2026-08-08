/**
 * Khẩn cấp khi admin quên MK và không còn admin nào đăng nhập được.
 * Chạy trên máy có DATABASE_URL (Render Shell / local):
 *   npx ts-node -r tsconfig-paths/register scripts/reset-admin-password.ts admin01@system.local
 *   npx ts-node -r tsconfig-paths/register scripts/reset-admin-password.ts --email=admin01@system.local --password=Admin@2026
 */
import bcrypt from "bcrypt";
import pool from "../src/config/db";

const BCRYPT_ROUNDS = 12;

async function main() {
  const args = process.argv.slice(2);
  let email = "";
  let newPassword = "";

  for (const arg of args) {
    if (arg.startsWith("--email=")) email = arg.slice("--email=".length).trim();
    else if (arg.startsWith("--password=")) newPassword = arg.slice("--password=".length);
    else if (!email) email = arg.trim();
  }

  if (!email) {
    console.error("Usage: reset-admin-password.ts <email> [--password=NewPass123]");
    process.exit(1);
  }

  const found = await pool.query<{ id: string; role: string; username: string }>(
    `SELECT id, role, username FROM accounts WHERE email = $1 LIMIT 1`,
    [email]
  );
  const row = found.rows[0];
  if (!row) {
    console.error(`Không tìm thấy tài khoản: ${email}`);
    process.exit(1);
  }
  if (row.role !== "admin") {
    console.error(`Tài khoản ${email} không phải admin (role=${row.role}).`);
    process.exit(1);
  }

  const plain =
    newPassword.trim() ||
    `Adm${Math.random().toString(36).slice(2, 8)}!${Date.now() % 100}`;
  const hashed = await bcrypt.hash(plain, BCRYPT_ROUNDS);

  await pool.query(
    `UPDATE accounts
     SET hashed_password = $1, password_plain = $2, first_login = true, updated_at = NOW()
     WHERE id = $3`,
    [hashed, plain, row.id]
  );

  console.log(`Đã reset MK cho admin ${row.username} (${email}).`);
  console.log(`Mật khẩu tạm: ${plain}`);
  console.log("Đăng nhập và đổi mật khẩu ngay trong Cài đặt tài khoản.");
  await pool.end();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
