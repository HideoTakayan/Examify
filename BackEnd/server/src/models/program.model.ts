import pool from "~/config/db";

export interface Program {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  subject_count?: number;
  teacher_count?: number;
}

export interface ProgramTeacherRef {
  id: string;
  full_name: string | null;
  email: string;
  username: string;
}

export async function getAllPrograms(): Promise<Program[]> {
  const r = await pool.query<Program & { subject_count: string; teacher_count: string }>(
    `SELECT p.*,
            (
              SELECT COUNT(DISTINCT s.id)::int
              FROM subjects s
              LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
              LEFT JOIN program_subject_groups psg
                ON psg.subject_group_id = sg.id AND psg.program_id = p.id
              LEFT JOIN program_subjects ps ON ps.subject_id = s.id AND ps.program_id = p.id
              WHERE s.is_active = true
                AND (
                  sg.group_scope = 'base'
                  OR psg.program_id IS NOT NULL
                  OR ps.program_id IS NOT NULL
                )
            ) AS subject_count,
            COUNT(DISTINCT pt.teacher_id)::int AS teacher_count
     FROM programs p
     LEFT JOIN program_teachers pt ON pt.program_id = p.id
     GROUP BY p.id
     ORDER BY p.name ASC`
  );
  return r.rows.map((row) => ({
    ...row,
    subject_count: Number(row.subject_count) || 0,
    teacher_count: Number(row.teacher_count) || 0,
  }));
}

export async function getProgramById(id: string): Promise<Program | null> {
  const r = await pool.query<Program>("SELECT * FROM programs WHERE id = $1", [id]);
  return r.rows[0] ?? null;
}

export async function getProgramByCode(code: string): Promise<Program | null> {
  const r = await pool.query<Program>(
    "SELECT * FROM programs WHERE code = $1",
    [code.trim().toUpperCase()]
  );
  return r.rows[0] ?? null;
}

export interface CreateProgramInput {
  code: string;
  name: string;
  description?: string | null;
}

export async function createProgram(input: CreateProgramInput): Promise<Program> {
  const r = await pool.query(
    `INSERT INTO programs (code, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.code.trim().toUpperCase(), input.name.trim(), input.description ?? null]
  );
  return r.rows[0];
}

export interface UpdateProgramInput {
  code?: string;
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export async function updateProgram(
  id: string,
  input: UpdateProgramInput
): Promise<Program | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (input.code !== undefined) {
    fields.push(`code = $${idx++}`);
    values.push(input.code.trim().toUpperCase());
  }
  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(input.description);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }
  if (fields.length === 0) return getProgramById(id);
  const r = await pool.query(
    `UPDATE programs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    [...values, id]
  );
  return r.rows[0] ?? null;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const r = await pool.query("DELETE FROM programs WHERE id = $1", [id]);
  return (r.rowCount ?? 0) > 0;
}

export async function getProgramTeachers(programId: string): Promise<ProgramTeacherRef[]> {
  const r = await pool.query<ProgramTeacherRef>(
    `SELECT a.id, a.full_name, a.email, a.username
     FROM program_teachers pt
     JOIN accounts a ON a.id = pt.teacher_id
     WHERE pt.program_id = $1 AND a.role = 'teacher'
     ORDER BY a.full_name NULLS LAST, a.email`,
    [programId]
  );
  return r.rows;
}

export async function setProgramTeachers(
  programId: string,
  teacherIds: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM program_teachers WHERE program_id = $1", [programId]);
    for (const teacherId of teacherIds) {
      await client.query(
        `INSERT INTO program_teachers (program_id, teacher_id)
         SELECT $1, $2
         WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $2 AND role = 'teacher')`,
        [programId, teacherId]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
