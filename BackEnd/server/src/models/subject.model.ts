import pool from "~/config/db";

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category?: string | null;
  subject_group_id?: string | null;
  program_id?: string | null;
  prerequisites?: string[] | null;
  is_active: boolean;
  created_at: string;
}

function mapSubjectRow(row: Record<string, unknown>): Subject {
  const prereq = row.prerequisites;
  let prerequisites: string[] | null = null;
  if (Array.isArray(prereq)) {
    prerequisites = prereq.filter((x): x is string => typeof x === "string");
  }
  return {
    id: row.id as string,
    name: row.name as string,
    code: (row.code as string) ?? "",
    credits: Number(row.credits) || 0,
    semester: Number(row.semester) || 0,
    category: (row.category as string) ?? "general",
    sub_category: (row.sub_category as string) ?? null,
    subject_group_id: (row.subject_group_id as string) ?? null,
    program_id: (row.program_id as string) ?? null,
    prerequisites,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
  };
}

export const getAllSubjects = async (): Promise<Subject[]> => {
  const result = await pool.query("SELECT * FROM subjects ORDER BY semester ASC, name ASC");
  return result.rows.map(mapSubjectRow);
};

export const querySubjectsPaginated = async (
  limit: number,
  offset: number,
  search?: string,
  programId?: string,
  subCategory?: string,
  subjectGroupId?: string,
  catalogGroup?: { code: string; subjectIds: string[] }
): Promise<{ items: Subject[]; total: number }> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (programId) {
    conditions.push(`(
      EXISTS (
        SELECT 1 FROM subject_groups sg
        LEFT JOIN program_subject_groups psg
          ON psg.subject_group_id = sg.id AND psg.program_id = $${idx}
        WHERE sg.id = subjects.subject_group_id
          AND (sg.group_scope = 'base' OR psg.program_id IS NOT NULL)
      )
      OR EXISTS (
        SELECT 1 FROM program_subjects ps
        WHERE ps.subject_id = subjects.id AND ps.program_id = $${idx}
      )
    )`);
    values.push(programId);
    idx++;
  }

  if (catalogGroup && (catalogGroup.subjectIds.length > 0 || catalogGroup.code)) {
    if (catalogGroup.subjectIds.length > 0) {
      conditions.push(
        `(id = ANY($${idx++}::uuid[]) OR sub_category = $${idx++})`
      );
      values.push(catalogGroup.subjectIds);
      values.push(catalogGroup.code);
    } else {
      conditions.push(`sub_category = $${idx++}`);
      values.push(catalogGroup.code);
    }
  } else {
    if (subCategory?.trim()) {
      conditions.push(`sub_category = $${idx++}`);
      values.push(subCategory.trim());
    }
    if (subjectGroupId?.trim()) {
      conditions.push(`subject_group_id = $${idx++}`);
      values.push(subjectGroupId.trim());
    }
  }

  if (search?.trim()) {
    conditions.push(
      `(name ILIKE $${idx} OR code ILIKE $${idx} OR category ILIKE $${idx})`
    );
    values.push(`%${search.trim()}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM subjects ${where}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await pool.query(
    `SELECT * FROM subjects ${where}
     ORDER BY semester ASC, name ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return { items: result.rows.map(mapSubjectRow), total };
};

export const getSubjectById = async (id: string): Promise<Subject | null> => {
  const result = await pool.query("SELECT * FROM subjects WHERE id = $1", [id]);
  const row = result.rows[0];
  return row ? mapSubjectRow(row) : null;
};

export const getSubjectByName = async (name: string): Promise<Subject | null> => {
  const result = await pool.query(
    "SELECT * FROM subjects WHERE name = $1 LIMIT 1",
    [name.trim()]
  );
  const row = result.rows[0];
  return row ? mapSubjectRow(row) : null;
};

export interface CreateSubjectInput {
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
  sub_category?: string | null;
  subject_group_id?: string | null;
  program_id?: string | null;
  prerequisite_ids?: string[];
}

export const createSubject = async (input: CreateSubjectInput): Promise<Subject> => {
  const prereq = input.prerequisite_ids?.length ? input.prerequisite_ids : null;
  const result = await pool.query(
    `INSERT INTO subjects (name, code, credits, semester, category, sub_category, subject_group_id, program_id, prerequisites)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.name,
      input.code ?? "",
      input.credits ?? 0,
      input.semester ?? 0,
      input.category ?? "general",
      input.sub_category ?? null,
      input.subject_group_id ?? null,
      input.program_id ?? null,
      prereq,
    ]
  );
  return mapSubjectRow(result.rows[0]);
};

export interface UpdateSubjectInput {
  name?: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
  sub_category?: string | null;
  subject_group_id?: string | null;
  program_id?: string | null;
  prerequisite_ids?: string[];
  is_active?: boolean;
}

export const updateSubject = async (
  id: string,
  input: UpdateSubjectInput
): Promise<Subject | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name);
  }
  if (input.code !== undefined) {
    fields.push(`code = $${idx++}`);
    values.push(input.code);
  }
  if (input.credits !== undefined) {
    fields.push(`credits = $${idx++}`);
    values.push(input.credits);
  }
  if (input.semester !== undefined) {
    fields.push(`semester = $${idx++}`);
    values.push(input.semester);
  }
  if (input.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(input.category);
  }
  if (input.sub_category !== undefined) {
    fields.push(`sub_category = $${idx++}`);
    values.push(input.sub_category);
  }
  if (input.subject_group_id !== undefined) {
    fields.push(`subject_group_id = $${idx++}`);
    values.push(input.subject_group_id);
  }
  if (input.program_id !== undefined) {
    fields.push(`program_id = $${idx++}`);
    values.push(input.program_id);
  }
  if (input.prerequisite_ids !== undefined) {
    fields.push(`prerequisites = $${idx++}`);
    values.push(
      input.prerequisite_ids.length > 0 ? input.prerequisite_ids : null
    );
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }

  if (fields.length === 0) return getSubjectById(id);

  const result = await pool.query(
    `UPDATE subjects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    [...values, id]
  );
  const row = result.rows[0];
  return row ? mapSubjectRow(row) : null;
};

export const setSubjectPrerequisites = async (
  id: string,
  prerequisiteIds: string[]
): Promise<Subject | null> => {
  const result = await pool.query(
    `UPDATE subjects SET prerequisites = $2 WHERE id = $1 RETURNING *`,
    [id, prerequisiteIds.length > 0 ? prerequisiteIds : null]
  );
  const row = result.rows[0];
  return row ? mapSubjectRow(row) : null;
};

export const deleteSubject = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM subjects WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};

export type BulkDeleteSubjectsResult = {
  deleted: number;
  failed: Array<{ id: string; reason: string }>;
};

export async function deleteSubjectsByIds(ids: string[]): Promise<BulkDeleteSubjectsResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))];
  const failed: BulkDeleteSubjectsResult["failed"] = [];
  let deleted = 0;

  for (const id of unique) {
    try {
      const ok = await deleteSubject(id);
      if (ok) deleted += 1;
      else failed.push({ id, reason: "Không tìm thấy môn học" });
    } catch (e: unknown) {
      const pg = e as { code?: string; message?: string };
      if (pg.code === "23503") {
        failed.push({
          id,
          reason: "Môn đang được dùng (đề thi, lớp, ngân hàng câu hỏi…)",
        });
      } else {
        failed.push({ id, reason: pg.message ?? "Không xóa được" });
      }
    }
  }

  return { deleted, failed };
}
