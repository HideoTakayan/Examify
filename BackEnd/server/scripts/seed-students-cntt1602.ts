/**
 * Seed 34 sinh viên lớp DEMO CLASS (danh sách thực).
 * Usage: npx ts-node -r tsconfig-paths/register scripts/seed-students-cntt1602.ts
 */
import pool from "~/config/db";
import bcrypt from "bcrypt";

const STUDENTS = [
  { code: "1671020006", name: "Bùi Duy Anh" },
  { code: "1671020009", name: "Đào Trần Lê Việt Anh" },
  { code: "1671020049", name: "Nguyễn Ánh Cương" },
  { code: "1671020042", name: "Đoàn Minh Châu" },
  { code: "1671020043", name: "Nguyễn Thị Linh Chi" },
  { code: "1671020044", name: "Hà Minh Chiến" },
  { code: "1671020078", name: "Nguyễn Đức Đại" },
  { code: "1671020086", name: "Xa Đức Đồng" },
  { code: "1671020092", name: "Phùng Xuân Đức" },
  { code: "1671020117", name: "Vũ Văn Hiệp" },
  { code: "1671020111", name: "Nông Trung Hiếu" },
  { code: "1671020113", name: "Trần Minh Hiếu" },
  { code: "1671020125", name: "Vũ Khánh Hoàn" },
  { code: "1671020127", name: "Ngô Hữu Hoàng" },
  { code: "1671020153", name: "Nguyễn Quốc Hưng" },
  { code: "1671020173", name: "Bùi Tuấn Kiệt" },
  { code: "1671020162", name: "Nguyễn Đình Khánh" },
  { code: "1671020169", name: "Phạm Đăng Khương" },
  { code: "1671020177", name: "Trần Thị Thu Lan" },
  { code: "1671020190", name: "Nguyễn Ngọc Bảo Long" },
  { code: "1671020191", name: "Nguyễn Văn Long" },
  { code: "1671020192", name: "Phạm Đức Long" },
  { code: "1671020203", name: "Nguyễn Đức Mạnh" },
  { code: "1671020207", name: "Vũ Đức Minh" },
  { code: "1671020208", name: "Ngô Thị Mừng" },
  { code: "1671020250", name: "Vũ Triệu Phú" },
  { code: "1671020261", name: "Bạch Công Quân" },
  { code: "1671020266", name: "Trần Hồng Quân" },
  { code: "1671020273", name: "Vũ Tài Sang" },
  { code: "1671020282", name: "Nguyễn Văn Tân" },
  { code: "1671020302", name: "Nguyễn Tất Thắng" },
  { code: "1671020311", name: "Nguyễn Thị Thúy" },
  { code: "1671020322", name: "Phạm Thị Huyền Trang" },
  { code: "1671020326", name: "Nguyễn Viết Trọng" },
  { code: "1671020350", name: "Đỗ Quốc Việt" },
  { code: "1671020351", name: "Lê Văn Việt" },
  { code: "1671020357", name: "Phan Đình Quang Vinh" },
];

async function main() {
  const acRow = await pool.query(
    `SELECT id FROM admin_classes WHERE display_name = 'DEMO CLASS' LIMIT 1`
  );
  if (!acRow.rows[0]) {
    console.error("Lớp DEMO CLASS chưa tồn tại. Chạy npm run migrate trước.");
    process.exit(1);
  }
  const adminClassId = acRow.rows[0].id;
  const defaultHash = await bcrypt.hash("Test@123", 12);

  let created = 0;
  let skipped = 0;

  for (const s of STUDENTS) {
    const email = `${s.code}@st.phenikaa-uni.edu.vn`;
    const username = s.code;
    const existing = await pool.query(
      `SELECT id FROM accounts WHERE email = $1 OR username = $2`,
      [email, username]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE accounts SET admin_class_id = $1, password_plain = COALESCE(password_plain, 'Test@123'),
                first_login = true
         WHERE (email = $2 OR username = $3) AND role = 'student'`,
        [adminClassId, email, username]
      );
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO accounts (email, username, hashed_password, password_plain, role, full_name, admin_class_id, first_login)
       VALUES ($1, $2, $3, 'Test@123', 'student', $4, $5, true)`,
      [email, username, defaultHash, s.name, adminClassId]
    );
    created++;
  }

  console.log(`Seed DEMO CLASS: created=${created}, skipped/updated=${skipped}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
