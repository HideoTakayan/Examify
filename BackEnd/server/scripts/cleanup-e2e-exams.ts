/**
 * Xóa đề thi E2E còn sót (title "E2E Exam ...") và phiên thi liên quan (CASCADE).
 *
 * Usage: npm run cleanup:e2e-exams
 */
import pool from "~/config/db";

async function main() {
  const preview = await pool.query<{ id: string; title: string }>(
    `SELECT id, title FROM exams WHERE title ILIKE 'E2E Exam%' ORDER BY created_at DESC`
  );
  if (preview.rows.length === 0) {
    console.log("Không có đề E2E nào cần xóa.");
    await pool.end();
    return;
  }
  console.log(`Sẽ xóa ${preview.rows.length} đề E2E:`);
  for (const row of preview.rows) {
    console.log(`  - ${row.title} (${row.id})`);
  }

  const deleted = await pool.query(
    `DELETE FROM exams WHERE title ILIKE 'E2E Exam%' RETURNING id`
  );
  console.log(`Đã xóa ${deleted.rowCount ?? 0} đề (phiên thi liên quan xóa theo CASCADE).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
