import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:admin@localhost:5432/Examify",
});

const EXACT_DATA = [
  // 2025-2026 HK3
  { code: 'CSE703010', score: 8.1, semester: 'HK3', year: 2025 },
  { code: 'CSE702031', score: 8.6, semester: 'HK3', year: 2025 },
  { code: 'CSE703125', score: 8.0, semester: 'HK3', year: 2025 },
  { code: 'CSE702063', score: 6.7, semester: 'HK3', year: 2025 },
  // 2025-2026 HK2
  { code: 'CSE702131', score: 8.7, semester: 'HK2', year: 2025 },
  { code: 'CSE702027', score: 8.4, semester: 'HK2', year: 2025 },
  { code: 'CSE702051', score: 7.9, semester: 'HK2', year: 2025 },
  { code: 'CSE702128', score: 7.9, semester: 'HK2', year: 2025 },
  // 2025-2026 HK1
  { code: 'CSE703004', score: 7.6, semester: 'HK1', year: 2025 },
  { code: 'CSE702011', score: 6.3, semester: 'HK1', year: 2025 },
  { code: 'CSE703048', score: 8.3, semester: 'HK1', year: 2025 },
  { code: 'CSE703124', score: 8.5, semester: 'HK1', year: 2025 },
  // 2024-2025 HK3
  { code: 'CSE702025', score: 8.3, semester: 'HK3', year: 2024 },
  { code: 'CSE703029', score: 9.4, semester: 'HK3', year: 2024 },
  { code: 'FFS702005', score: 8.9, semester: 'HK3', year: 2024 },
  { code: 'EEE703068', score: 5.1, semester: 'HK3', year: 2024 },
  { code: 'CSE703123', score: 7.6, semester: 'HK3', year: 2024 },
  { code: 'CSE703064', score: 8.9, semester: 'HK3', year: 2024 },
  // 2024-2025 HK2
  { code: 'FFS702004', score: 8.1, semester: 'HK2', year: 2024 },
  { code: 'CSE703008', score: 8.3, semester: 'HK2', year: 2024 },
  { code: 'CSE702017', score: 6.9, semester: 'HK2', year: 2024 },
  { code: 'CSE703023', score: 7.9, semester: 'HK2', year: 2024 },
  { code: 'FBE702001', score: 8.1, semester: 'HK2', year: 2024 },
  { code: 'CSE703122', score: 8.5, semester: 'HK2', year: 2024 },
  { code: 'FFS702006', score: 8.4, semester: 'HK2', year: 2024 },
  // 2024-2025 HK1
  { code: 'FFS701070', score: 5.1, semester: 'HK1', year: 2024 },
  { code: 'FFS702003', score: 7.4, semester: 'HK1', year: 2024 },
  { code: 'CSE702036', score: 8.5, semester: 'HK1', year: 2024 },
  { code: 'FEL703001', score: 6.8, semester: 'HK1', year: 2024 },
  { code: 'CSE703121', score: 9.1, semester: 'HK1', year: 2024 },
  { code: 'FFS703013', score: 9.1, semester: 'HK1', year: 2024 },
  // 2023-2024 HK3
  { code: 'CSE703006', score: 9.0, semester: 'HK3', year: 2023 },
  { code: 'FFS703008', score: 6.4, semester: 'HK3', year: 2023 },
  { code: 'CSE702116', score: 8.3, semester: 'HK3', year: 2023 },
  { code: 'FTS702001', score: 8.2, semester: 'HK3', year: 2023 },
  { code: 'EEE703044', score: 8.8, semester: 'HK3', year: 2023 },
  { code: 'CSE703120', score: 8.8, semester: 'HK3', year: 2023 },
  // 2023-2024 HK2
  { code: 'FFS701068', score: 6.5, semester: 'HK2', year: 2023 },
  { code: 'FFS703010', score: 9.5, semester: 'HK2', year: 2023 },
  { code: 'FEL704000', score: 7.3, semester: 'HK2', year: 2023 },
  { code: 'CSE703119', score: 8.9, semester: 'HK2', year: 2023 },
  { code: 'CSE703024', score: 6.2, semester: 'HK2', year: 2023 },
  { code: 'FFS703002', score: 8.3, semester: 'HK2', year: 2023 },
  // 2023-2024 HK1
  { code: 'FFS701072', score: 10, semester: 'HK1', year: 2023 },
  { code: 'FFS703007', score: 4.6, semester: 'HK1', year: 2023 },
  { code: 'DT00001', score: 4.7, semester: 'HK1', year: 2023 }, // Might not exist, we'll try to insert or ignore
  { code: 'CSE703038', score: 7.6, semester: 'HK1', year: 2023 },
  { code: 'CSE702040', score: 6.7, semester: 'HK1', year: 2023 },
  { code: 'FFS702001', score: 7.0, semester: 'HK1', year: 2023 },
  { code: 'CSE703118', score: 8.8, semester: 'HK1', year: 2023 },
];

async function run() {
  console.log("=== SEED EXACT DATA FOR STUDENT01 ===");

  const stRes = await pool.query(`SELECT id FROM accounts WHERE email = 'student01@st.phenikaa-uni.edu.vn'`);
  if (stRes.rowCount === 0) {
    console.error("student01 not found");
    process.exit(1);
  }
  const studentId = stRes.rows[0].id;

  const tcRes = await pool.query(`SELECT id FROM accounts WHERE role = 'teacher' LIMIT 1`);
  const teacherId = tcRes.rows[0].id;

  // Clear existing exam sessions for student01
  await pool.query(`DELETE FROM exam_sessions WHERE student_id = $1`, [studentId]);
  
  for (const item of EXACT_DATA) {
    const subRes = await pool.query(`SELECT id FROM subjects WHERE code = $1 LIMIT 1`, [item.code]);
    let subjectId;
    if (subRes.rowCount === 0) {
      if (item.code === 'DT00001') {
         // Create DT00001
         const ng = await pool.query(`INSERT INTO subjects (code, name, credits) VALUES ($1, $2, $3) RETURNING id`, ['DT00001', 'Kiểm tra năng lực tiếng Anh đầu khóa', 0]);
         subjectId = ng.rows[0].id;
      } else {
         console.warn(`Subject ${item.code} not found, skipping.`);
         continue;
      }
    } else {
      subjectId = subRes.rows[0].id;
    }

    // Find or create class for the specific semester/year
    let classId;
    const clRes = await pool.query(`SELECT id FROM classes WHERE subject_id = $1 AND semester = $2 AND year = $3 LIMIT 1`, [subjectId, item.semester, item.year]);
    if ((clRes.rowCount || 0) > 0) {
      classId = clRes.rows[0].id;
    } else {
      const nc = await pool.query(`INSERT INTO classes (subject_id, teacher_id, semester, year) VALUES ($1, $2, $3, $4) RETURNING id`, [subjectId, teacherId, item.semester, item.year]);
      classId = nc.rows[0].id;
    }

    // Find or create exam
    let examId;
    const exRes = await pool.query(`SELECT id FROM exams WHERE class_id = $1 LIMIT 1`, [classId]);
    if ((exRes.rowCount || 0) > 0) {
      examId = exRes.rows[0].id;
    } else {
      const ne = await pool.query(`INSERT INTO exams (title, description, class_id, created_by, duration_min) VALUES ($1, $2, $3, $4, 60) RETURNING id`, [`Thi CK ${item.code}`, `Thi CK`, classId, teacherId]);
      examId = ne.rows[0].id;
    }

    // Enroll
    await pool.query(`INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [classId, studentId]);

    // Insert session
    await pool.query(`INSERT INTO exam_sessions (exam_id, student_id, status, score, max_points, grading_status) VALUES ($1, $2, 'submitted', $3, 10.0, 'complete')`, [examId, studentId, item.score]);
    console.log(`Seeded ${item.code} with score ${item.score} for ${item.semester}/${item.year}`);
  }

  console.log("DONE");
  process.exit(0);
}

run().catch(console.error);
