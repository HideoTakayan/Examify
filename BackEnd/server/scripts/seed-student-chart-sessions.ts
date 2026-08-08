/**
 * Gán ~10 bài thi đã nộp cho mỗi SV (lớp hành chính) để biểu đồ dashboard có đủ điểm.
 * Không xóa phiên cũ — chỉ thêm phiên còn thiếu.
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/seed-student-chart-sessions.ts
 */
import { randomUUID } from "crypto";
import pool from "~/config/db";

const EXAMS_PER_STUDENT = 10;

function hash01(a: string, b: string): number {
  let h = 0;
  const s = `${a}:${b}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

async function main() {
  const acR = await pool.query<{ id: string }>(
    `SELECT id FROM admin_classes WHERE display_name ILIKE '%CNTT%16%02%' LIMIT 1`
  );
  if (!acR.rows[0]) {
    console.error("Không tìm thấy lớp DEMO CLASS");
    process.exit(1);
  }
  const adminClassId = acR.rows[0].id;

  const examR = await pool.query<{ id: string; title: string; max_pts: string }>(
    `
    SELECT e.id, e.title,
           COALESCE(SUM(q.points), 10)::text AS max_pts
    FROM exams e
    JOIN questions q ON q.exam_id = e.id
    WHERE e.admin_class_id = $1 OR e.admin_class_id IS NULL
    GROUP BY e.id, e.title
    HAVING COUNT(q.id) > 0
    ORDER BY e.created_at DESC
    LIMIT $2
    `,
    [adminClassId, EXAMS_PER_STUDENT]
  );

  if (examR.rows.length < EXAMS_PER_STUDENT) {
    const extra = await pool.query<{ id: string; title: string; max_pts: string }>(
      `
      SELECT e.id, e.title,
             COALESCE(SUM(q.points), 10)::text AS max_pts
      FROM exams e
      JOIN questions q ON q.exam_id = e.id
      GROUP BY e.id, e.title
      HAVING COUNT(q.id) > 0
      ORDER BY e.created_at DESC
      LIMIT $1
      `,
      [EXAMS_PER_STUDENT]
    );
    const seen = new Set(examR.rows.map((r) => r.id));
    for (const row of extra.rows) {
      if (examR.rows.length >= EXAMS_PER_STUDENT) break;
      if (!seen.has(row.id)) {
        examR.rows.push(row);
        seen.add(row.id);
      }
    }
  }

  const exams = examR.rows.slice(0, EXAMS_PER_STUDENT);
  if (exams.length === 0) {
    console.error("Không có đề thi nào có câu hỏi.");
    process.exit(1);
  }

  const studentR = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM accounts
     WHERE role = 'student' AND admin_class_id = $1 AND is_active = true
     ORDER BY email`,
    [adminClassId]
  );

  if (studentR.rows.length === 0) {
    console.error("Không có sinh viên trong lớp.");
    process.exit(1);
  }

  console.log(`Đề thi (${exams.length}):`);
  for (const e of exams) console.log(`  - ${e.title}`);

  let inserted = 0;
  let skipped = 0;

  for (const student of studentR.rows) {
    let n = 0;
    for (const exam of exams) {
      const exists = await pool.query(
        `SELECT 1 FROM exam_sessions
         WHERE student_id = $1 AND exam_id = $2 AND status IN ('submitted', 'expired')
         LIMIT 1`,
        [student.id, exam.id]
      );
      if (exists.rows.length > 0) {
        skipped++;
        continue;
      }

      const maxPoints = Math.max(1, Number(exam.max_pts) || 10);
      const ratio = 0.45 + hash01(student.id, exam.id) * 0.5;
      const score = Math.round(maxPoints * ratio * 10) / 10;
      const daysAgo = Math.floor(hash01(exam.id, student.id) * 20) + 1;
      const started = new Date(Date.now() - daysAgo * 86400000);
      const submitted = new Date(started.getTime() + 45 * 60_000);

      await pool.query(
        `INSERT INTO exam_sessions (
           id, exam_id, student_id, status, started_at, submitted_at,
           score, max_points, graded_details, grading_status
         )
         VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, '[]'::jsonb, 'complete')`,
        [
          randomUUID(),
          exam.id,
          student.id,
          started.toISOString(),
          submitted.toISOString(),
          score,
          maxPoints,
        ]
      );
      inserted++;
      n++;
    }
    console.log(`  ${student.email}: +${n} phiên (tối đa ${exams.length} đề)`);
  }

  console.log(`\nHoàn tất: thêm ${inserted} phiên, bỏ qua ${skipped} (đã có).`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
