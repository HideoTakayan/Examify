import pool from "~/config/db";

async function check() {
  const r1 = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_runtime_state')`
  );
  console.log("exam_runtime_state exists:", r1.rows[0].exists);

  const r2 = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'media_url'`
  );
  console.log("media_url column exists:", r2.rows.length > 0);

  await pool.end();
}

check().catch((e) => { console.error(e.message); process.exit(1); });