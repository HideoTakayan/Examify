import pool from "~/config/db";
import { getSubjectGroupById, getSubjectGroupByCode } from "~/models/subjectGroup.model";
import type { CreateSubjectInput, UpdateSubjectInput } from "~/models/subject.model";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Môn thuộc nhóm (UUID nhóm DB hoặc mã catalog pe, math, …). */
export async function getSubjectIdsForCatalogGroup(
  groupKey: string
): Promise<string[]> {
  const key = groupKey.trim();
  if (!key) return [];

  if (UUID_RE.test(key)) {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM subjects WHERE is_active = true AND subject_group_id = $1`,
      [key]
    );
    return r.rows.map((row) => row.id);
  }

  const group = await pool.query<{ id: string; code: string }>(
    `SELECT id, code FROM subject_groups WHERE code = $1 LIMIT 1`,
    [key]
  );
  const row = group.rows[0];
  if (!row) return [];

  const r = await pool.query<{ id: string }>(
    `SELECT id FROM subjects
     WHERE is_active = true
       AND (
         subject_group_id = $1
         OR (subject_group_id IS NULL AND sub_category = $2)
       )`,
    [row.id, row.code]
  );
  return r.rows.map((x) => x.id);
}

export async function linkSubjectToCatalogGroup<T extends CreateSubjectInput | UpdateSubjectInput>(
  input: T
): Promise<T> {
  if (input.subject_group_id) {
    const row = await getSubjectGroupById(input.subject_group_id);
    if (row) {
      return {
        ...input,
        sub_category: row.code,
      };
    }
  }
  const code = input.sub_category?.trim();
  if (!code) return input;
  const row = await getSubjectGroupByCode(code);
  if (!row) return input;
  return {
    ...input,
    subject_group_id: row.id,
    sub_category: row.code,
  };
}
