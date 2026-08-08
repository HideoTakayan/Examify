
import pool from "~/config/db";

export interface Class {
  id: string;
  subject_id: string;
  teacher_id: string;
  semester: string;
  year: number;
  created_at: string;
}

export interface ClassDetail extends Class {
  subject_name: string;
  subject_code: string;
  teacher_name: string | null;
  teacher_email: string;
}

export const getAllClasses = async (): Promise<ClassDetail[]> => {
  const result = await pool.query(`
    SELECT c.*,
           s.name AS subject_name, s.code AS subject_code,
           a.full_name AS teacher_name, a.email AS teacher_email
    FROM classes c
    JOIN subjects s ON s.id = c.subject_id
    JOIN accounts a ON a.id = c.teacher_id
    ORDER BY c.year DESC, c.semester DESC
  `);
  return result.rows;
};

export const getClassById = async (id: string): Promise<ClassDetail | null> => {
  const result = await pool.query(`
    SELECT c.*,
           s.name AS subject_name, s.code AS subject_code,
           a.full_name AS teacher_name, a.email AS teacher_email
    FROM classes c
    JOIN subjects s ON s.id = c.subject_id
    JOIN accounts a ON a.id = c.teacher_id
    WHERE c.id = $1
  `, [id]);
  return result.rows[0] ?? null;
};

export const getClassesByTeacher = async (teacherId: string): Promise<ClassDetail[]> => {
  const result = await pool.query(`
    SELECT c.*,
           s.name AS subject_name, s.code AS subject_code,
           a.full_name AS teacher_name, a.email AS teacher_email
    FROM classes c
    JOIN subjects s ON s.id = c.subject_id
    JOIN accounts a ON a.id = c.teacher_id
    WHERE c.teacher_id = $1
    ORDER BY c.year DESC, c.semester DESC
  `, [teacherId]);
  return result.rows;
};

export const getClassesByStudent = async (studentId: string): Promise<ClassDetail[]> => {
  const result = await pool.query(`
    SELECT c.*,
           s.name AS subject_name, s.code AS subject_code,
           a.full_name AS teacher_name, a.email AS teacher_email
    FROM classes c
    JOIN subjects s ON s.id = c.subject_id
    JOIN accounts a ON a.id = c.teacher_id
    JOIN enrollments e ON e.class_id = c.id
    WHERE e.student_id = $1
    ORDER BY c.year DESC, c.semester DESC
  `, [studentId]);
  return result.rows;
};

export const createClass = async (
  subjectId: string,
  teacherId: string,
  semester: string,
  year: number
): Promise<Class> => {
  const result = await pool.query(
    "INSERT INTO classes (subject_id, teacher_id, semester, year) VALUES ($1, $2, $3, $4) RETURNING *",
    [subjectId, teacherId, semester, year]
  );
  return result.rows[0];
};

export const deleteClass = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM classes WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};