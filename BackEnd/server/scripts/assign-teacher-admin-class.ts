/**
 * Gán GV (gv01 / teacher01) làm chủ nhiệm lớp DEMO CLASS.
 * Chạy: npm run assign-teacher-class
 * Hoặc: npx ts-node -r tsconfig-paths/register scripts/assign-teacher-admin-class.ts [email]
 */
import pool from "../src/config/db";

const DEFAULT_CLASS = "DEMO CLASS";
const TEACHER_EMAILS = ["gv01@system.local", "teacher01@system.local"];

async function main(): Promise<void> {
  const emailArg = process.argv[2]?.trim();

  const classRow = await pool.query<{ id: string; display_name: string; manager_teacher_id: string | null }>(
    `SELECT id, display_name, manager_teacher_id FROM admin_classes
     WHERE display_name = $1 OR (program_code = 'CNTT' AND intake_year = 16 AND section = '02')
     LIMIT 1`,
    [DEFAULT_CLASS]
  );

  let adminClass = classRow.rows[0];
  if (!adminClass) {
    const inserted = await pool.query<{ id: string; display_name: string; manager_teacher_id: string | null }>(
      `INSERT INTO admin_classes (program_code, intake_year, section, display_name)
       VALUES ('CNTT', 16, '02', $1)
       RETURNING id, display_name, manager_teacher_id`,
      [DEFAULT_CLASS]
    );
    adminClass = inserted.rows[0];
    console.log(`[ok] Đã tạo admin_class: ${adminClass.display_name} (${adminClass.id})`);
  }

  const teacherRes = emailArg
    ? await pool.query<{ id: string; email: string }>(
        `SELECT id, email FROM accounts WHERE email = $1 AND role = 'teacher'`,
        [emailArg]
      )
    : await pool.query<{ id: string; email: string }>(
        `SELECT id, email FROM accounts WHERE role = 'teacher' AND email = ANY($1::text[])
         ORDER BY CASE email WHEN 'gv01@system.local' THEN 0 WHEN 'teacher01@system.local' THEN 1 ELSE 2 END
         LIMIT 1`,
        [TEACHER_EMAILS]
      );

  const teacher = teacherRes.rows[0];
  if (!teacher) {
    console.error(
      "[lỗi] Không tìm thấy tài khoản teacher. Tạo user trước hoặc truyền email:\n" +
        "  npx ts-node -r tsconfig-paths/register scripts/assign-teacher-admin-class.ts gv01@system.local"
    );
    const all = await pool.query(`SELECT email, role FROM accounts WHERE role = 'teacher'`);
    console.log("Teachers hiện có:", all.rows);
    process.exit(1);
  }

  await pool.query(
    `UPDATE admin_classes SET manager_teacher_id = $1 WHERE id = $2`,
    [teacher.id, adminClass.id]
  );

  await pool.query(
    `UPDATE accounts SET admin_class_id = $1 WHERE role = 'student' AND admin_class_id IS NULL
     AND email IN ('sv01@system.local', 'student01@system.local')`,
    [adminClass.id]
  );

  console.log(`[ok] Đã gán ${teacher.email} → chủ nhiệm ${adminClass.display_name}`);
  console.log(`     GET /v1/admin-classes/me với token GV sẽ trả lớp này.`);
  console.log(`     Đăng nhập lại FE (hoặc F5) rồi tạo đề thi.`);
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    void pool.end();
    process.exit(1);
  });
