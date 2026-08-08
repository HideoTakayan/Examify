import bcrypt from "bcrypt";
import pool from "~/config/db";

async function main() {
  const hash = await bcrypt.hash("Test@123", 12);
  console.log("Hash:", hash);

  const r = await pool.query(
    "UPDATE accounts SET hashed_password = $1 WHERE email = $2 RETURNING email",
    [hash, "admin01@system.local"]
  );
  console.log("Updated admin:", r.rows[0]);

  const r2 = await pool.query(
    "UPDATE accounts SET hashed_password = $1 WHERE email = $2 RETURNING email",
    [hash, "student01@system.local"]
  );
  console.log("Updated student:", r2.rows[0]);

  const r3 = await pool.query(
    "UPDATE accounts SET hashed_password = $1 WHERE email = $2 RETURNING email",
    [hash, "teacher01@system.local"]
  );
  console.log("Updated teacher:", r3.rows[0]);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  pool.end();
});