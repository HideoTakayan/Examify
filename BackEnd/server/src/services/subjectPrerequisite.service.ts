import pool from "~/config/db";
import { getSubjectById, type Subject } from "~/models/subject.model";
import { httpError } from "~/services/exam.service";

export type SubjectPrerequisiteRef = {
  id: string;
  name: string;
  code: string;
};

export type SubjectDetail = Omit<Subject, "prerequisites"> & {
  prerequisites: SubjectPrerequisiteRef[];
};

function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && id.trim()) out.push(id.trim());
  }
  return [...new Set(out)];
}

export async function getSubjectsByIds(ids: string[]): Promise<Subject[]> {
  if (ids.length === 0) return [];
  const r = await pool.query<Subject>(
    `SELECT * FROM subjects WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return r.rows;
}

export async function expandPrerequisites(
  prerequisiteIds: string[] | null | undefined
): Promise<SubjectPrerequisiteRef[]> {
  const ids = normalizeIds(prerequisiteIds ?? []);
  if (ids.length === 0) return [];
  const rows = await getSubjectsByIds(ids);
  const byId = new Map(rows.map((s) => [s.id, s]));
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is Subject => Boolean(s))
    .map((s) => ({ id: s.id, name: s.name, code: s.code ?? "" }));
}

export async function attachPrerequisites(subject: Subject): Promise<SubjectDetail> {
  const row = subject as Subject & { sub_category?: string | null; prerequisites?: string[] | null };
  const prerequisites = await expandPrerequisites(row.prerequisites ?? []);
  return {
    ...subject,
    sub_category: row.sub_category ?? null,
    prerequisites,
  };
}

/** Không cho phép vòng phụ thuộc (A → B → A). */
export async function assertNoPrerequisiteCycle(
  subjectId: string,
  prerequisiteIds: string[]
): Promise<void> {
  const ids = normalizeIds(prerequisiteIds);
  if (ids.includes(subjectId)) {
    throw httpError(400, "Môn không thể phụ thuộc chính nó");
  }
  if (ids.length === 0) return;

  const r = await pool.query<{ id: string; prerequisites: string[] | null }>(
    `SELECT id, prerequisites FROM subjects`
  );
  const graph = new Map<string, string[]>();
  for (const row of r.rows) {
    graph.set(row.id, normalizeIds(row.prerequisites));
  }
  graph.set(subjectId, ids);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  if (dfs(subjectId)) {
    throw httpError(400, "Phụ thuộc môn học tạo vòng lặp — hãy kiểm tra lại");
  }
}

export async function validatePrerequisiteIds(
  prerequisiteIds: string[],
  excludeSubjectId?: string
): Promise<string[]> {
  const ids = normalizeIds(prerequisiteIds);
  if (ids.length === 0) return [];

  const found = await getSubjectsByIds(ids);
  if (found.length !== ids.length) {
    throw httpError(400, "Một hoặc nhiều môn tiên quyết không tồn tại");
  }
  if (excludeSubjectId) {
    await assertNoPrerequisiteCycle(excludeSubjectId, ids);
  }
  return ids;
}

export async function getSubjectDetailById(id: string): Promise<SubjectDetail | null> {
  const subject = await getSubjectById(id);
  if (!subject) return null;
  return attachPrerequisites(subject);
}
