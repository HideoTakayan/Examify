/**
 * Sửa đề thi có khung giờ sai (ví dụ ends_at cách opens_at 30 ngày).
 * Đặt lại ends_at = opens_at + 3 giờ (khung thi thực tế).
 *
 * Usage (từ BackEnd/server):
 *   npm run fix:exam-schedule-windows
 *   npm run fix:exam-schedule-windows -- --dry-run
 */
import pool from "~/config/db";

const EXAM_WINDOW_HOURS = 3;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const r = await pool.query<{
    id: string;
    title: string;
    opens_at: string;
    ends_at: string;
  }>(
    `SELECT id, title, opens_at, ends_at
     FROM exams
     WHERE title NOT ILIKE 'E2E Exam%'
       AND opens_at IS NOT NULL
       AND ends_at IS NOT NULL
       AND ends_at - opens_at > INTERVAL '1 day'
     ORDER BY opens_at ASC`
  );

  if (r.rows.length === 0) {
    console.log("Không có đề nào có khung giờ dài hơn 1 ngày.");
    await pool.end();
    return;
  }

  console.log(`${dryRun ? "[DRY-RUN] " : ""}Sửa ${r.rows.length} đề thi:\n`);

  for (const row of r.rows) {
    const opens = new Date(row.opens_at);
    const ends = new Date(opens.getTime() + EXAM_WINDOW_HOURS * 60 * 60 * 1000);
    console.log(`  • ${row.title}`);
    console.log(`    Cũ: ${row.opens_at} → ${row.ends_at}`);
    console.log(`    Mới: ${opens.toISOString()} → ${ends.toISOString()}\n`);

    if (!dryRun) {
      await pool.query(
        `UPDATE exams
         SET ends_at = $2::timestamptz, closes_at = $2::timestamptz
         WHERE id = $1`,
        [row.id, ends.toISOString()]
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
