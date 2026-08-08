import pool from "~/config/db";
import { addOwnerOnCreate } from "./examCollaborators.model";

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id: string | null;
  admin_class_id: string | null;
  subject_id: string | null;
  created_by: string;
  duration_min: number;
  num_versions: number;
  closes_at: string | null;
  opens_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface ExamDetail extends Exam {
  subject_name: string;
  subject_code: string | null;
  admin_class_name: string | null;
  class_semester: string | null;
  class_year: number | null;
  creator_name: string | null;
  /** GV đã start-runtime và chưa hết giờ lớp */
  runtime_is_active?: boolean;
}

const examSelectBase = `
  SELECT e.*,
         COALESCE(s.name, s2.name) AS subject_name,
         COALESCE(s.code, s2.code) AS subject_code,
         ac.display_name AS admin_class_name,
         c.semester AS class_semester,
         c.year AS class_year,
         a.full_name AS creator_name,
         (rs.is_active = true AND rs.ends_at > NOW()) AS runtime_is_active
  FROM exams e
  LEFT JOIN admin_classes ac ON ac.id = e.admin_class_id
  LEFT JOIN subjects s ON s.id = e.subject_id
  LEFT JOIN classes c ON c.id = e.class_id
  LEFT JOIN subjects s2 ON s2.id = c.subject_id
  LEFT JOIN accounts a ON a.id = e.created_by
  LEFT JOIN exam_runtime_state rs ON rs.exam_id = e.id
`;

export const getAllExams = async (): Promise<ExamDetail[]> => {
  const result = await pool.query(`${examSelectBase} ORDER BY e.created_at DESC`);
  return result.rows;
};

export interface ExamListFilter {
  class_id?: string;
  admin_class_id?: string;
  search?: string;
  /** Chỉ bài thi gắn môn thuộc CTĐT (picker-catalog) */
  subject_ids?: string[];
}

function programSubjectMatchSql(subjectIdsParam: string): string {
  return `(
    e.subject_id = ANY(${subjectIdsParam}::uuid[])
    OR EXISTS (
      SELECT 1 FROM subjects sc
      WHERE sc.id = ANY(${subjectIdsParam}::uuid[])
        AND (
          (
            COALESCE(s.code, s2.code) IS NOT NULL AND sc.code IS NOT NULL
            AND upper(trim(sc.code)) = upper(trim(COALESCE(s.code, s2.code)))
          )
          OR lower(trim(sc.name)) = lower(trim(COALESCE(s.name, s2.name)))
        )
    )
  )`;
}

export const queryExamsPaginated = async (
  filter: ExamListFilter,
  limit: number,
  offset: number
): Promise<{ items: ExamDetail[]; total: number }> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filter.admin_class_id) {
    conditions.push(`e.admin_class_id = $${idx++}`);
    values.push(filter.admin_class_id);
  }
  if (filter.class_id) {
    conditions.push(`e.class_id = $${idx++}`);
    values.push(filter.class_id);
  }
  if (filter.search?.trim()) {
    conditions.push(
      `(e.title ILIKE $${idx} OR COALESCE(s.name, s2.name) ILIKE $${idx} OR COALESCE(s.code, s2.code) ILIKE $${idx})`
    );
    values.push(`%${filter.search.trim()}%`);
    idx++;
  }
  if (filter.subject_ids && filter.subject_ids.length > 0) {
    const param = `$${idx++}`;
    conditions.push(programSubjectMatchSql(param));
    values.push(filter.subject_ids);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM exams e
     LEFT JOIN subjects s ON s.id = e.subject_id
     LEFT JOIN classes c ON c.id = e.class_id
     LEFT JOIN subjects s2 ON s2.id = c.subject_id
     ${where}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await pool.query(
    `${examSelectBase} ${where} ORDER BY e.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return { items: result.rows as ExamDetail[], total };
};

export const getExamsByAdminClass = async (adminClassId: string): Promise<Exam[]> => {
  const result = await pool.query(
    "SELECT * FROM exams WHERE admin_class_id = $1 ORDER BY created_at DESC",
    [adminClassId]
  );
  return result.rows;
};

export const getExamsByClass = async (classId: string): Promise<Exam[]> => {
  const result = await pool.query(
    "SELECT * FROM exams WHERE class_id = $1 ORDER BY created_at DESC",
    [classId]
  );
  return result.rows;
};

export const getExamById = async (id: string): Promise<ExamDetail | null> => {
  const result = await pool.query(`${examSelectBase} WHERE e.id = $1`, [id]);
  return result.rows[0] ?? null;
};

export const createExam = async (
  title: string,
  createdBy: string,
  durationMin: number,
  opts: {
    classId?: string | null;
    adminClassId?: string | null;
    subjectId?: string | null;
    description?: string;
    closesAt?: string | null;
    opensAt?: string | null;
    endsAt?: string | null;
    numVersions?: number;
  }
): Promise<Exam> => {
  const result = await pool.query(
    `INSERT INTO exams (title, description, class_id, admin_class_id, subject_id, created_by, duration_min, num_versions, closes_at, opens_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      title,
      opts.description ?? null,
      opts.classId ?? null,
      opts.adminClassId ?? null,
      opts.subjectId ?? null,
      createdBy,
      durationMin,
      opts.numVersions ?? 2,
      opts.closesAt ?? null,
      opts.opensAt ?? null,
      opts.endsAt ?? null,
    ]
  );
  const exam = result.rows[0] as Exam;
  await addOwnerOnCreate(exam.id, createdBy);
  return exam;
};

export const updateExam = async (
  id: string,
  fields: Partial<
    Pick<
      Exam,
      "title" | "description" | "duration_min" | "closes_at" | "opens_at" | "ends_at" | "admin_class_id" | "subject_id" | "num_versions"
    >
  >
): Promise<Exam | null> => {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;

  const setClauses = entries.map(([key], i) => `${key} = $${i + 2}`).join(", ");
  const values = entries.map(([, value]) => value);
  const result = await pool.query(
    `UPDATE exams SET ${setClauses} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] ?? null;
};

export const deleteExam = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM exams WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};
