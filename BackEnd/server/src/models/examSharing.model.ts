import pool from "~/config/db";

export type ExamShareRole = "viewer" | "grader" | "co-owner";
export type GradingAssignmentStatus = "pending" | "in_progress" | "completed";

export interface ExamShare {
  id: string;
  exam_id: string;
  shared_with: string;
  role: ExamShareRole;
  assigned_by: string;
  assigned_at: string;
}

export interface GradingAssignment {
  id: string;
  exam_session_id: string;
  exam_id: string;
  teacher_id: string;
  assigned_by: string;
  assigned_at: string;
  graded_at: string | null;
  status: GradingAssignmentStatus;
  notes: string | null;
}

// --- Exam Shares ---

export const shareExamWith = async (
  examId: string,
  sharedWith: string,
  role: ExamShareRole,
  assignedBy: string
): Promise<ExamShare> => {
  const result = await pool.query(
    `INSERT INTO exam_shares (exam_id, shared_with, role, assigned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (exam_id, shared_with) DO UPDATE SET role = $3
     RETURNING *`,
    [examId, sharedWith, role, assignedBy]
  );
  return result.rows[0];
};

export const getExamShares = async (examId: string): Promise<ExamShare[]> => {
  const result = await pool.query(
    `SELECT es.*, a.full_name AS shared_with_name
     FROM exam_shares es
     JOIN accounts a ON a.id = es.shared_with
     WHERE es.exam_id = $1
     ORDER BY es.assigned_at DESC`,
    [examId]
  );
  return result.rows;
};

export const removeExamShare = async (examId: string, sharedWith: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM exam_shares WHERE exam_id = $1 AND shared_with = $2",
    [examId, sharedWith]
  );
  return (result.rowCount ?? 0) > 0;
};

export const getSharedExams = async (userId: string): Promise<{ exam_id: string; role: ExamShareRole }[]> => {
  const result = await pool.query(
    "SELECT exam_id, role FROM exam_shares WHERE shared_with = $1",
    [userId]
  );
  return result.rows;
};

export const canAccessExam = async (examId: string, userId: string): Promise<boolean> => {
  const exam = await pool.query("SELECT created_by FROM exams WHERE id = $1", [examId]);
  if (exam.rows.length === 0) return false;
  if (exam.rows[0].created_by === userId) return true;

  const share = await pool.query(
    "SELECT 1 FROM exam_shares WHERE exam_id = $1 AND shared_with = $2",
    [examId, userId]
  );
  return share.rows.length > 0;
};

// --- Grading Assignments ---

export const assignGrader = async (
  examSessionId: string,
  examId: string,
  teacherId: string,
  assignedBy: string
): Promise<GradingAssignment> => {
  const result = await pool.query(
    `INSERT INTO grading_assignments (exam_session_id, exam_id, teacher_id, assigned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (exam_session_id, teacher_id) DO NOTHING
     RETURNING *`,
    [examSessionId, examId, teacherId, assignedBy]
  );
  return result.rows[0];
};

export const getGradingAssignments = async (
  examSessionId?: string,
  teacherId?: string
): Promise<GradingAssignment[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (examSessionId) { conditions.push(`exam_session_id = $${idx++}`); params.push(examSessionId); }
  if (teacherId) { conditions.push(`teacher_id = $${idx++}`); params.push(teacherId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT ga.*, a.full_name AS teacher_name
     FROM grading_assignments ga
     JOIN accounts a ON a.id = ga.teacher_id
     ${where}
     ORDER BY ga.assigned_at DESC`,
    params
  );
  return result.rows;
};

export const updateGradingStatus = async (
  assignmentId: string,
  status: GradingAssignmentStatus,
  notes?: string
): Promise<GradingAssignment | null> => {
  const result = await pool.query(
    `UPDATE grading_assignments
     SET status = $2, graded_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE NULL END,
         notes = COALESCE($3, notes)
     WHERE id = $1
     RETURNING *`,
    [assignmentId, status, notes ?? null]
  );
  return result.rows[0] ?? null;
};

export const getGradingAssignmentsByExam = async (examId: string): Promise<GradingAssignment[]> => {
  const result = await pool.query(
    `SELECT ga.*, a.full_name AS teacher_name
     FROM grading_assignments ga
     JOIN accounts a ON a.id = ga.teacher_id
     WHERE ga.exam_id = $1
     ORDER BY ga.assigned_at DESC`,
    [examId]
  );
  return result.rows;
};

export const getMyGradingAssignments = async (teacherId: string): Promise<GradingAssignment[]> => {
  const result = await pool.query(
    `SELECT ga.*, es.student_id, e.title AS exam_title
     FROM grading_assignments ga
     JOIN exam_sessions es ON es.id = ga.exam_session_id
     JOIN exams e ON e.id = ga.exam_id
     WHERE ga.teacher_id = $1
     ORDER BY ga.assigned_at DESC`,
    [teacherId]
  );
  return result.rows;
};

export const getPendingGradingCount = async (teacherId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM grading_assignments
     WHERE teacher_id = $1 AND status IN ('pending', 'in_progress')`,
    [teacherId]
  );
  return Number(result.rows[0].count);
};