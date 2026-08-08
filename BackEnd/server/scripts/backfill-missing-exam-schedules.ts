/**
 * Gán lịch thi (opens_at / ends_at) cho đề chưa có — khung 3 giờ.
 * Dùng ngày tạo đề làm mốc; nếu đã qua thì đẩy sang tuần tới cùng khung giờ.
 *
 * Usage (từ BackEnd/server):
 *   npm run backfill:exam-schedules
 *   npm run backfill:exam-schedules -- --dry-run
 */
import pool from "~/config/db";

const EXAM_WINDOW_HOURS = 3;
const DEFAULT_START_HOUR = 8;

function buildWindowFromCreated(createdAt: Date, slotIndex: number): { opens: Date; ends: Date } {
  const opens = new Date(createdAt);
  opens.setHours(DEFAULT_START_HOUR + (slotIndex % 4), 0, 0, 0);

  const ends = new Date(opens.getTime() + EXAM_WINDOW_HOURS * 60 * 60 * 1000);
  const now = Date.now();

  while (ends.getTime() <= now) {
    opens.setDate(opens.getDate() + 7);
    ends.setTime(opens.getTime() + EXAM_WINDOW_HOURS * 60 * 60 * 1000);
  }

  return { opens, ends };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const r = await pool.query<{
    id: string;
    title: string;
    created_at: string;
  }>(
    `SELECT id, title, created_at
     FROM exams
     WHERE title NOT ILIKE 'E2E Exam%'
       AND opens_at IS NULL
       AND ends_at IS NULL
       AND closes_at IS NULL
     ORDER BY created_at ASC`
  );

  if (r.rows.length === 0) {
    console.log("Không có đề nào thiếu lịch (opens_at / ends_at).");
    await pool.end();
    return;
  }

  console.log(`${dryRun ? "[DRY-RUN] " : ""}Gán lịch cho ${r.rows.length} đề:\n`);

  let slot = 0;
  for (const row of r.rows) {
    const { opens, ends } = buildWindowFromCreated(new Date(row.created_at), slot);
    slot += 1;

    console.log(`  • ${row.title}`);
    console.log(`    Mở:  ${opens.toISOString()}  (${opens.toLocaleString("vi-VN")})`);
    console.log(`    Đóng: ${ends.toISOString()}  (${ends.toLocaleString("vi-VN")})\n`);

    if (!dryRun) {
      await pool.query(
        `UPDATE exams
         SET opens_at = $2::timestamptz,
             ends_at = $3::timestamptz,
             closes_at = $3::timestamptz
         WHERE id = $1`,
        [row.id, opens.toISOString(), ends.toISOString()]
      );
    }
  }

  console.log(dryRun ? "Chạy lại không có --dry-run để áp dụng." : "Hoàn tất.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
