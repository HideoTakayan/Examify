import fs from "fs";
import path from "path";
import pool from "../src/config/db";

const migrationsDir = path.resolve(__dirname, "../src/db/migrations");

async function ensureMigrationTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runMigration(filename: string): Promise<void> {
  const existing = await pool.query(
    "SELECT 1 FROM schema_migrations WHERE filename = $1",
    [filename]
  );
  if (existing.rowCount) {
    console.log(`[migration] skip ${filename}`);
    return;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8").replace(/^\uFEFF/, "");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await client.query("COMMIT");
    console.log(`[migration] applied ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`[migration] failed ${filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  await ensureMigrationTable();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await runMigration(file);
  }
}

main()
  .then(async () => {
    await pool.end();
    console.log("[migration] done");
  })
  .catch(async (error) => {
    await pool.end();
    console.error("[migration] aborted", error);
    process.exit(1);
  });
