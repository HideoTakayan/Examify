import pool from "~/config/db";

export type CollaboratorRole = "owner" | "grader";

export interface ExamCollaborator {
  id: string;
  exam_id: string;
  teacher_id: string;
  role: CollaboratorRole;
  created_at: string;
}

export interface ExamCollaboratorWithName extends ExamCollaborator {
  teacher_name: string | null;
  teacher_email: string;
}

// Add a collaborator (or update role if already exists)
export const addCollaborator = async (
  examId: string,
  teacherId: string,
  role: CollaboratorRole = "grader"
): Promise<ExamCollaborator> => {
  const result = await pool.query(
    `INSERT INTO exam_collaborators (exam_id, teacher_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (exam_id, teacher_id) DO UPDATE SET role = $3
     RETURNING *`,
    [examId, teacherId, role]
  );
  return result.rows[0] as ExamCollaborator;
};

// List collaborators for an exam
export const getCollaborators = async (examId: string): Promise<ExamCollaboratorWithName[]> => {
  const result = await pool.query(
    `SELECT ec.*, a.full_name AS teacher_name, a.email AS teacher_email
     FROM exam_collaborators ec
     JOIN accounts a ON a.id = ec.teacher_id
     WHERE ec.exam_id = $1
     ORDER BY ec.created_at ASC`,
    [examId]
  );
  return result.rows as ExamCollaboratorWithName[];
};

// Remove a collaborator
export const removeCollaborator = async (
  examId: string,
  teacherId: string
): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM exam_collaborators
     WHERE exam_id = $1 AND teacher_id = $2`,
    [examId, teacherId]
  );
  return (result.rowCount ?? 0) > 0;
};

// Check if a teacher is a collaborator (or owner) on an exam
export const isCollaborator = async (
  examId: string,
  teacherId: string
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM exam_collaborators
     WHERE exam_id = $1 AND teacher_id = $2`,
    [examId, teacherId]
  );
  return result.rows.length > 0;
};

// Check if teacher has at least 'grader' access (includes owner)
export const canAccessExam = async (
  examId: string,
  teacherId: string
): Promise<boolean> => {
  const owner = await pool.query(
    `SELECT 1 FROM exams WHERE id = $1 AND created_by = $2`,
    [examId, teacherId]
  );
  if (owner.rows.length > 0) return true;

  return isCollaborator(examId, teacherId);
};

// Check if teacher has 'owner' role on an exam
export const isOwner = async (
  examId: string,
  teacherId: string
): Promise<boolean> => {
  const owner = await pool.query(
    `SELECT 1 FROM exams WHERE id = $1 AND created_by = $2`,
    [examId, teacherId]
  );
  if (owner.rows.length > 0) return true;

  const collab = await pool.query(
    `SELECT 1 FROM exam_collaborators
     WHERE exam_id = $1 AND teacher_id = $2 AND role = 'owner'`,
    [examId, teacherId]
  );
  return collab.rows.length > 0;
};

// When exam is created, automatically add creator as owner collaborator
export const addOwnerOnCreate = async (examId: string, teacherId: string): Promise<void> => {
  await pool.query(
    `INSERT INTO exam_collaborators (exam_id, teacher_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (exam_id, teacher_id) DO NOTHING`,
    [examId, teacherId]
  );
};

// List all exams where teacher is a collaborator
export const getMyCollaborations = async (teacherId: string): Promise<ExamCollaborator[]> => {
  const result = await pool.query(
    `SELECT * FROM exam_collaborators
     WHERE teacher_id = $1
     ORDER BY created_at DESC`,
    [teacherId]
  );
  return result.rows as ExamCollaborator[];
};