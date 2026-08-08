import pool from "~/config/db";

export type GroupScope = "base" | "shared" | "catalog";

export async function assignGroupsToProgram(
  programId: string,
  groupIds: string[]
): Promise<number> {
  if (groupIds.length === 0) return 0;
  const r = await pool.query(
    `INSERT INTO program_subject_groups (program_id, subject_group_id)
     SELECT $1, unnest($2::uuid[])
     ON CONFLICT (program_id, subject_group_id) DO NOTHING`,
    [programId, groupIds]
  );
  return r.rowCount ?? 0;
}

export async function unassignGroupFromProgram(
  programId: string,
  groupId: string
): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM program_subject_groups WHERE program_id = $1 AND subject_group_id = $2`,
    [programId, groupId]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function assignSubjectsToProgram(
  programId: string,
  subjectIds: string[]
): Promise<number> {
  if (subjectIds.length === 0) return 0;
  const r = await pool.query(
    `INSERT INTO program_subjects (program_id, subject_id)
     SELECT $1, unnest($2::uuid[])
     ON CONFLICT (program_id, subject_id) DO NOTHING`,
    [programId, subjectIds]
  );
  return r.rowCount ?? 0;
}

export async function unassignSubjectFromProgram(
  programId: string,
  subjectId: string
): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM program_subjects WHERE program_id = $1 AND subject_id = $2`,
    [programId, subjectId]
  );
  return (r.rowCount ?? 0) > 0;
}

/** Áp tất cả nhóm base vào chương trình ngành */
export async function applyBaseGroupsToProgram(programId: string): Promise<number> {
  const r = await pool.query(
    `INSERT INTO program_subject_groups (program_id, subject_group_id)
     SELECT $1, sg.id FROM subject_groups sg
     WHERE sg.group_scope = 'base' AND sg.is_active = true
     ON CONFLICT (program_id, subject_group_id) DO NOTHING`,
    [programId]
  );
  return r.rowCount ?? 0;
}

export async function getAssignedGroupIdsForProgram(programId: string): Promise<string[]> {
  const r = await pool.query<{ subject_group_id: string }>(
    `SELECT subject_group_id FROM program_subject_groups WHERE program_id = $1`,
    [programId]
  );
  return r.rows.map((row) => row.subject_group_id);
}

export async function countProgramSubjects(programId: string): Promise<number> {
  const r = await pool.query<{ c: number }>(
    `SELECT COUNT(DISTINCT s.id)::int AS c
     FROM subjects s
     LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
     LEFT JOIN program_subject_groups psg
       ON psg.subject_group_id = sg.id AND psg.program_id = $1
     LEFT JOIN program_subjects ps ON ps.subject_id = s.id AND ps.program_id = $1
     WHERE s.is_active = true
       AND (
         sg.group_scope = 'base'
         OR psg.program_id IS NOT NULL
         OR ps.program_id IS NOT NULL
       )`,
    [programId]
  );
  return r.rows[0]?.c ?? 0;
}
