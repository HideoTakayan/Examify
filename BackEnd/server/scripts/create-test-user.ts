import bcrypt from "bcrypt";
import pool from "../src/config/db";

async function createTestUser() {
  console.log("Creating test user...");
  const hashed = await bcrypt.hash("test123", 12);
  const result = await pool.query(`
    INSERT INTO accounts (email, username, hashed_password, role, full_name)
    VALUES ('test@test.com', 'testuser', $1, 'student', 'Test User')
    ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password
    RETURNING id, email, username, role
  `, [hashed]);
  console.log("Result:", JSON.stringify(result.rows, null, 2));
  await pool.end();
  console.log("Done!");
}

createTestUser().catch(err => {
  console.error("Error:", err);
  pool.end();
  process.exit(1);
});
