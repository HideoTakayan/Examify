/**
 * Xóa toàn bộ câu tự luận khỏi đề thi và ngân hàng câu hỏi (chỉ giữ trắc nghiệm).
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/remove-essay-questions.ts
 */
import pool from "~/config/db";

async function main() {
  const bank = await pool.query(`DELETE FROM question_bank WHERE question_type = 'essay'`);
  const qs = await pool.query(`DELETE FROM questions WHERE question_type = 'essay'`);

  console.log(`Đã xóa ${qs.rowCount ?? 0} câu tự luận trong đề thi.`);
  console.log(`Đã xóa ${bank.rowCount ?? 0} câu tự luận trong ngân hàng câu hỏi.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
