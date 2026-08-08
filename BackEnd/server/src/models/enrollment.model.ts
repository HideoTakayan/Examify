import pool from "~/config/db";

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export const getEnrollmentsByClass = async (classId: string): Promise<any[]> => {
  const result = await pool.query(`
    SELECT e.*, a.full_name, a.email, a.username
    FROM enrollments e
    JOIN accounts a ON a.id = e.student_id
    WHERE e.class_id = $1
    ORDER BY a.full_name ASC
  `, [classId]);
  return result.rows;
};

export const getEnrollmentsByStudent = async (studentId: string): Promise<Enrollment[]> => {
  const result = await pool.query(
    "SELECT * FROM enrollments WHERE student_id = $1",
    [studentId]
  );
  return result.rows;
};

export const findEnrollment = async (
  classId: string,
  studentId: string
): Promise<Enrollment | null> => {
  const result = await pool.query(
    "SELECT * FROM enrollments WHERE class_id = $1 AND student_id = $2",
    [classId, studentId]
  );
  return result.rows[0] ?? null;
};

export const createEnrollment = async (
  classId: string,
  studentId: string
): Promise<Enrollment> => {
  const result = await pool.query(
    "INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2) RETURNING *",
    [classId, studentId]
  );
  return result.rows[0];
};

export const deleteEnrollment = async (
  classId: string,
  studentId: string
): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM enrollments WHERE class_id = $1 AND student_id = $2",
    [classId, studentId]
  );
  return (result.rowCount ?? 0) > 0;
};