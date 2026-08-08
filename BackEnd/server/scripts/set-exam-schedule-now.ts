/**
 * Đặt lịch một bài thi để test auto start/end (mặc định 15:45–15:50 hôm nay, giờ VN).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/set-exam-schedule-now.ts
 *   npx ts-node -r tsconfig-paths/register scripts/set-exam-schedule-now.ts --exam-id <uuid>
 */
import pool from "~/config/db";

function parseArgs(): { examId: string | null } {
  const idx = process.argv.indexOf("--exam-id");
  if (idx >= 0 && process.argv[idx + 1]) {
    return { examId: process.argv[idx + 1] };
  }
  return { examId: null };
}

async function main() {
  const { examId: argExamId } = parseArgs();

  // 15:45–15:50 ngày hôm nay (UTC+7) — chỉnh tại đây nếu cần
  const opensLocal = new Date();
  opensLocal.setHours(15, 45, 0, 0);
  const endsLocal = new Date();
  endsLocal.setHours(15, 50, 0, 0);

  const opensAt = opensLocal.toISOString();
  const endsAt = endsLocal.toISOString();
  const durationMin = 5;

  let examId = argExamId;
  if (!examId) {
    const pick = await pool.query<{ id: string; title: string }>(
      `SELECT e.id, e.title
       FROM exams e
       WHERE EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id)
       ORDER BY e.created_at DESC
       LIMIT 1`
    );
    if (!pick.rows[0]) {
      console.error("Không có bài thi nào có câu hỏi.");
      process.exit(1);
    }
    examId = pick.rows[0].id;
    console.log(`Chọn bài thi mới nhất: ${pick.rows[0].title} (${examId})`);
  }

  await pool.query(
    `UPDATE exam_runtime_state
     SET is_active = false, ends_at = NOW()
     WHERE exam_id = $1 AND is_active = true`,
    [examId]
  );

  const r = await pool.query<{
    id: string;
    title: string;
    opens_at: string;
    ends_at: string;
    duration_min: number;
  }>(
    `UPDATE exams
     SET opens_at = $2::timestamptz,
         ends_at = $3::timestamptz,
         closes_at = $3::timestamptz,
         duration_min = $4
     WHERE id = $1
     RETURNING id, title, opens_at, ends_at, duration_min`,
    [examId, opensAt, endsAt, durationMin]
  );

  const row = r.rows[0];
  if (!row) {
    console.error("Không tìm thấy exam_id:", examId);
    process.exit(1);
  }

  console.log("\n=== Đã cập nhật lịch thi (test auto flow) ===");
  console.log(`Tiêu đề: ${row.title}`);
  console.log(`ID:      ${row.id}`);
  console.log(`Mở:      ${row.opens_at}  (${opensLocal.toLocaleString("vi-VN")})`);
  console.log(`Đóng:    ${row.ends_at}  (${endsLocal.toLocaleString("vi-VN")})`);
  console.log(`Thời gian làm bài: ${row.duration_min} phút`);
  console.log("\nJob server tick mỗi 15s — đảm bảo BackEnd đang chạy.");
  console.log("Sinh viên vào /exams hoặc dashboard trước 15:45 để thấy bài mở.");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
