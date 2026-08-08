const pool = require('./dist/config/db').default;

const email = 'testuser@test.com';
const username = 'testuser';
const hashedPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4Q0y2uKhIExxYXqO'; // plain: test123
const role = 'student';
const fullName = 'Test User';

pool.query(`
  INSERT INTO accounts (email, username, hashed_password, role, full_name)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email, username, role;
`, [email, username, hashedPassword, role, fullName])
  .then(r => {
    console.log('Result:', r.rows);
    pool.end();
  })
  .catch(err => {
    console.error('Error:', err);
    pool.end();
  });
