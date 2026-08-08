/**
 * Khôi phục gán nhóm/môn CNTT sau khi import ngành khác ghi đè subject_group_id.
 * Không xóa đề thi — chỉ tạo/cập nhật môn catalog (PE001, ND001, …) và gán lại program_subjects.
 * Chạy: npm run sync-cntt-catalog
 */
import pool from "../src/config/db";
import {
  CNTT_CATALOG_GROUPS,
  CNTT_CATALOG_SUBJECTS,
  enrichCnttSubjectFromCurriculum,
  scopeForCnttGroup,
  type SubjectSeed,
} from "./cntt-catalog-data";

async function upsertCnttGroup(
  client: import("pg").PoolClient,
  g: (typeof CNTT_CATALOG_GROUPS)[0]
): Promise<string> {
  const scope = scopeForCnttGroup(g.code);
  const found = await client.query<{ id: string }>(
    `SELECT id FROM subject_groups WHERE LOWER(code) = LOWER($1) LIMIT 1`,
    [g.code]
  );
  if (found.rows[0]) {
    await client.query(
      `UPDATE subject_groups
       SET name = $2, description = $3, sort_order = $4, group_scope = $5, is_active = true
       WHERE id = $1`,
      [found.rows[0].id, g.name, g.description ?? null, g.sort_order, scope]
    );
    return found.rows[0].id;
  }
  const ins = await client.query<{ id: string }>(
    `INSERT INTO subject_groups (program_id, code, name, description, sort_order, group_scope, is_active)
     VALUES (NULL, $1, $2, $3, $4, $5, true)
     RETURNING id`,
    [g.code, g.name, g.description ?? null, g.sort_order, scope]
  );
  return ins.rows[0].id;
}

async function upsertCatalogSubject(
  client: import("pg").PoolClient,
  s: SubjectSeed,
  groupId: string
): Promise<string> {
  const code = s.code.trim();
  const byCode = await client.query<{ id: string }>(
    `SELECT id FROM subjects WHERE LOWER(TRIM(code)) = LOWER($1) LIMIT 1`,
    [code]
  );
  if (byCode.rows[0]) {
    await client.query(
      `UPDATE subjects
       SET name = $2, subject_group_id = $3, sub_category = $4, category = $5,
           credits = $6, semester = $7, is_active = true
       WHERE id = $1`,
      [
        byCode.rows[0].id,
        s.name,
        groupId,
        s.groupCode,
        s.category,
        s.credits ?? 0,
        s.semester ?? 0,
      ]
    );
    return byCode.rows[0].id;
  }

  const ins = await client.query<{ id: string }>(
    `INSERT INTO subjects (name, code, credits, semester, category, sub_category, subject_group_id, program_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, true)
     RETURNING id`,
    [
      s.name,
      code,
      s.credits ?? 0,
      s.semester ?? 0,
      s.category,
      s.groupCode,
      groupId,
    ]
  );
  return ins.rows[0].id;
}

async function main() {
  console.log("=== SYNC CNTT CATALOG (nhóm + môn) ===\n");

  const prog = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTT' LIMIT 1`
  );
  const programId = prog.rows[0]?.id;
  if (!programId) {
    console.error("Không tìm thấy program CNTT");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const groupIdByCode = new Map<string, string>();
    for (const g of CNTT_CATALOG_GROUPS) {
      const id = await upsertCnttGroup(client, g);
      groupIdByCode.set(g.code, id);
      await client.query(
        `INSERT INTO program_subject_groups (program_id, subject_group_id, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (program_id, subject_group_id)
         DO UPDATE SET sort_order = EXCLUDED.sort_order`,
        [programId, id, g.sort_order]
      );
    }

    const catalogSubjectIds: string[] = [];
    for (const raw of CNTT_CATALOG_SUBJECTS) {
      const s = enrichCnttSubjectFromCurriculum(raw);
      const groupId = groupIdByCode.get(s.groupCode);
      if (!groupId) throw new Error(`Missing group ${s.groupCode}`);
      const subjectId = await upsertCatalogSubject(client, s, groupId);
      catalogSubjectIds.push(subjectId);
    }

    await client.query(`DELETE FROM program_subjects WHERE program_id = $1`, [programId]);
    for (const subjectId of catalogSubjectIds) {
      await client.query(
        `INSERT INTO program_subjects (program_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [programId, subjectId]
      );
    }

    await client.query("COMMIT");

    const counts = await pool.query<{ code: string; c: number }>(`
      SELECT sg.code, COUNT(s.id)::int c
      FROM subject_groups sg
      JOIN program_subject_groups psg ON psg.subject_group_id = sg.id AND psg.program_id = $1
      LEFT JOIN subjects s ON s.subject_group_id = sg.id AND s.is_active = true
      GROUP BY sg.code, sg.sort_order
      ORDER BY sg.sort_order
    `, [programId]);

    console.log("Số môn theo nhóm (sau sync):");
    for (const r of counts.rows) {
      console.log(`  ${r.code}: ${r.c}`);
    }
    console.log(`\n✓ Đã gán ${catalogSubjectIds.length} môn catalog cho CNTT.`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
