/**
 * Xóa bài thi lớp CNTT gắn môn KHÔNG thuộc CTĐT CNTT (cùng danh mục picker-catalog).
 *
 *   npx ts-node -r tsconfig-paths/register scripts/remove-non-cntt-exams.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register scripts/remove-non-cntt-exams.ts --confirm
 */
import pool from "~/config/db";
import { getProgramSubjectIds } from "~/services/subjectCatalog.service";

async function main() {
  const dryRun = !process.argv.includes("--confirm");
  const cnttSubjectIds = await getProgramSubjectIds();
  if (cnttSubjectIds.length === 0) {
    console.error("Không có môn trong CTĐT CNTT. Chạy reseed/sync catalog trước.");
    process.exit(1);
  }
  console.log(`Môn thuộc CTĐT CNTT (picker-catalog): ${cnttSubjectIds.length}`);

  const rows = await pool.query<{ id: string; title: string; subject_name: string | null }>(
    `SELECT e.id, e.title, s.name AS subject_name
     FROM exams e
     JOIN admin_classes ac ON ac.id = e.admin_class_id
     LEFT JOIN subjects s ON s.id = e.subject_id
     WHERE ac.display_name ILIKE '%CNTT%'
       AND e.subject_id IS NOT NULL
       AND NOT (
         e.subject_id = ANY($1::uuid[])
         OR EXISTS (
           SELECT 1 FROM subjects sc
           WHERE sc.id = ANY($1::uuid[])
             AND (
               (
                 s.code IS NOT NULL AND sc.code IS NOT NULL
                 AND upper(trim(sc.code)) = upper(trim(s.code))
               )
               OR lower(trim(sc.name)) = lower(trim(s.name))
             )
         )
       )
     ORDER BY e.created_at DESC`,
    [cnttSubjectIds]
  );

  if (rows.rows.length === 0) {
    console.log("Không có bài thi ngoài CTĐT CNTT cần xóa.");
    await pool.end();
    return;
  }

  console.log(`\nSẽ xóa ${rows.rows.length} bài thi (môn không thuộc ngành CNTT):`);
  for (const row of rows.rows) {
    console.log(`  - ${row.title} [${row.subject_name ?? "?"}]`);
  }

  if (dryRun) {
    console.log("\nChạy lại với --confirm để xóa thật.");
    await pool.end();
    return;
  }

  const ids = rows.rows.map((r) => r.id);
  const del = await pool.query(`DELETE FROM exams WHERE id = ANY($1::uuid[])`, [ids]);
  console.log(`\nĐã xóa ${del.rowCount ?? ids.length} bài thi.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
