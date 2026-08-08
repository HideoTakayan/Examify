import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:admin@localhost:5432/Examify",
});

function randomScore() {
  // Score between 5.0 and 10.0
  const score = 5.0 + Math.random() * 5.0;
  return Math.round(score * 10) / 10;
}

async function run() {
  console.log("=== SEED STUDENT GRADES ===");

  const cnttvjRes = await pool.query(`SELECT id FROM programs WHERE code = 'CNTTVJ'`);
  if (cnttvjRes.rowCount === 0) {
    console.error("Program CNTTVJ not found!");
    process.exit(1);
  }
  const programId = cnttvjRes.rows[0].id;

  const subjectsRes = await pool.query(`SELECT id, name FROM subjects WHERE program_id = $1`, [programId]);
  if (subjectsRes.rowCount === 0) {
    console.error("No subjects found for CNTTVJ");
    process.exit(1);
  }
  const subjects = subjectsRes.rows;

  const studentsRes = await pool.query(`SELECT id FROM accounts WHERE role = 'student' AND is_active = true`);
  const students = studentsRes.rows;

  const teacherRes = await pool.query(`SELECT id FROM accounts WHERE role = 'teacher' AND is_active = true LIMIT 1`);
  const teacherId = teacherRes.rows[0]?.id;

  if (!teacherId || students.length === 0) {
    console.error("No teacher or students found");
    process.exit(1);
  }

  console.log(`Found ${subjects.length} subjects and ${students.length} students.`);

  let totalClasses = 0;
  let totalExams = 0;
  let totalEnrollments = 0;
  let totalSessions = 0;

  for (const subject of subjects) {
    // 1. Ensure a class exists
    let classId;
    const classRes = await pool.query(`SELECT id FROM classes WHERE subject_id = $1 LIMIT 1`, [subject.id]);
    if ((classRes.rowCount || 0) > 0) {
      classId = classRes.rows[0].id;
    } else {
      const newClass = await pool.query(
        `INSERT INTO classes (subject_id, teacher_id, semester, year) VALUES ($1, $2, 'HK1', 2026) RETURNING id`,
        [subject.id, teacherId]
      );
      classId = newClass.rows[0].id;
      totalClasses++;
    }

    // 2. Ensure an exam exists for this class
    let examId;
    const examRes = await pool.query(`SELECT id FROM exams WHERE class_id = $1 LIMIT 1`, [classId]);
    if ((examRes.rowCount || 0) > 0) {
      examId = examRes.rows[0].id;
    } else {
      const newExam = await pool.query(
        `INSERT INTO exams (title, description, class_id, created_by, duration_min) VALUES ($1, $2, $3, $4, 60) RETURNING id`,
        [`Thi cuối kỳ: ${subject.name}`, `Mô phỏng thi cuối kỳ`, classId, teacherId]
      );
      examId = newExam.rows[0].id;
      totalExams++;
    }

    // 3. Enroll students and create sessions
    for (const student of students) {
      // Enroll
      await pool.query(
        `INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2) ON CONFLICT (class_id, student_id) DO NOTHING`,
        [classId, student.id]
      );
      totalEnrollments++;

      // Check if session exists
      const sessionRes = await pool.query(
        `SELECT id FROM exam_sessions WHERE exam_id = $1 AND student_id = $2`,
        [examId, student.id]
      );
      
      if (sessionRes.rowCount === 0) {
        const score = randomScore();
        await pool.query(
          `INSERT INTO exam_sessions (exam_id, student_id, status, score, max_points, grading_status)
           VALUES ($1, $2, 'submitted', $3, 10.0, 'complete')`,
          [examId, student.id, score]
        );
        totalSessions++;
      }
    }
    process.stdout.write("."); // Progress
  }

  console.log(`\n\n--- Seeding Complete ---`);
  console.log(`New Classes created: ${totalClasses}`);
  console.log(`New Exams created: ${totalExams}`);
  console.log(`Enrollments checked/created: ${totalEnrollments}`);
  console.log(`New Exam Sessions (Grades) created: ${totalSessions}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
