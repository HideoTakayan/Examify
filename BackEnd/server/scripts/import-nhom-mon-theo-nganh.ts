/**
 * Import nhóm môn + môn học theo ngành từ nhom_mon_theo_nganh.json (bỏ qua CNTT).
 * Chạy: npm run import-majors-catalog
 */
import fs from "node:fs";
import path from "node:path";
import pool from "../src/config/db";
import { CNTT_GROUP_CODES } from "./cntt-catalog-data";

type SubjectRow = {
  id?: string;
  name: string;
  code?: string;
  credits?: number;
  sub_category?: string;
};

type GroupRow = {
  sort_order: number;
  code: string;
  label: string;
  subject_count?: number;
  subjects: SubjectRow[];
  note?: string;
};

type MajorRow = {
  nganh: string;
  total_subjects?: number;
  total_groups?: number;
  groups: GroupRow[];
};

type SourceFile = {
  majors: MajorRow[];
};

const SKIP_NGAN = /c[oô]ng ngh[eệ] th[oô]ng tin/i;

const PROGRAM_BY_NGAN: Record<string, { code: string; description?: string }> = {
  "Công nghệ kỹ thuật ô tô": {
    code: "CKTOTO",
    description: "Chương trình Công nghệ kỹ thuật ô tô",
  },
  "Luật kinh tế": {
    code: "LUATKT",
    description: "Chương trình Luật kinh tế",
  },
  "Quản trị dịch vụ du lịch và lữ hành": {
    code: "QTDVDL",
    description: "Chương trình Quản trị dịch vụ du lịch và lữ hành",
  },
  "Y Khoa": {
    code: "YKHOA",
    description: "Chương trình Y khoa",
  },
};

function normalizeCode(raw?: string | null): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function warehouseGroupCode(programCode: string, groupCode: string): string {
  return `${programCode.toLowerCase()}_${groupCode}`.slice(0, 120);
}

async function ensureProgram(
  client: import("pg").PoolClient,
  nganh: string
): Promise<{ id: string; code: string } | null> {
  if (SKIP_NGAN.test(nganh)) {
    console.log(`  ⏭ Bỏ qua (CNTT đã có): ${nganh}`);
    return null;
  }
  const meta = PROGRAM_BY_NGAN[nganh];
  if (!meta) {
    console.warn(`  ⚠ Không có mapping program cho ngành: ${nganh}`);
    return null;
  }
  const ins = await client.query<{ id: string; code: string }>(
    `INSERT INTO programs (code, name, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       description = COALESCE(EXCLUDED.description, programs.description)
     RETURNING id, code`,
    [meta.code, nganh, meta.description ?? null]
  );
  return ins.rows[0];
}

async function upsertWarehouseGroup(
  client: import("pg").PoolClient,
  code: string,
  name: string,
  sortOrder: number,
  description: string | null
): Promise<string> {
  const found = await client.query<{ id: string }>(
    `SELECT id FROM subject_groups WHERE LOWER(code) = LOWER($1) LIMIT 1`,
    [code]
  );
  if (found.rows[0]) {
    await client.query(
      `UPDATE subject_groups
       SET name = $2, sort_order = $3, description = $4, is_active = true
       WHERE id = $1`,
      [found.rows[0].id, name, sortOrder, description]
    );
    return found.rows[0].id;
  }
  const ins = await client.query<{ id: string }>(
    `INSERT INTO subject_groups (program_id, code, name, description, sort_order, group_scope, is_active)
     VALUES (NULL, $1, $2, $3, $4, 'catalog', true)
     RETURNING id`,
    [code, name, description, sortOrder]
  );
  return ins.rows[0].id;
}

async function findSubjectId(
  client: import("pg").PoolClient,
  code: string,
  name: string
): Promise<string | null> {
  if (code) {
    const byCode = await client.query<{ id: string }>(
      `SELECT id FROM subjects WHERE LOWER(TRIM(code)) = LOWER($1) LIMIT 1`,
      [code]
    );
    if (byCode.rows[0]) return byCode.rows[0].id;
  }
  const byName = await client.query<{ id: string }>(
    `SELECT id FROM subjects WHERE name = $1 LIMIT 1`,
    [name]
  );
  return byName.rows[0]?.id ?? null;
}

async function upsertSubject(
  client: import("pg").PoolClient,
  row: SubjectRow,
  groupId: string
): Promise<string> {
  const name = row.name.trim();
  const code = normalizeCode(row.code || row.id);
  const credits = Number(row.credits) || 0;
  const subCategory = row.sub_category?.trim() || null;
  const category = subCategory?.includes("internship") || subCategory === "thesis"
    ? "internship"
    : subCategory?.includes("english") || subCategory?.includes("pe")
      ? "general"
      : "major";

  const existingId = await findSubjectId(client, code, name);
  if (existingId) {
    const keepGroup = await client.query<{ code: string | null }>(
      `SELECT sg.code FROM subjects s
       LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
       WHERE s.id = $1`,
      [existingId]
    );
    const currentGroupCode = keepGroup.rows[0]?.code?.toLowerCase() ?? null;
    const protectCnttGroup =
      currentGroupCode != null && CNTT_GROUP_CODES.has(currentGroupCode);

    await client.query(
      `UPDATE subjects
       SET code = COALESCE(NULLIF($2, ''), code),
           credits = CASE WHEN $3 > 0 THEN $3 ELSE credits END,
           sub_category = CASE WHEN $6 THEN sub_category ELSE COALESCE($4, sub_category) END,
           subject_group_id = CASE WHEN $6 THEN subject_group_id ELSE $5 END,
           is_active = true
       WHERE id = $1`,
      [existingId, code, credits, subCategory, groupId, protectCnttGroup]
    );
    return existingId;
  }

  const ins = await client.query<{ id: string }>(
    `INSERT INTO subjects (name, code, credits, semester, category, sub_category, subject_group_id, program_id, is_active)
     VALUES ($1, $2, $3, 0, $4, $5, $6, NULL, true)
     RETURNING id`,
    [name, code, credits, category, subCategory, groupId]
  );
  return ins.rows[0].id;
}

async function linkProgramGroup(
  client: import("pg").PoolClient,
  programId: string,
  groupId: string,
  sortOrder: number
): Promise<void> {
  await client.query(
    `INSERT INTO program_subject_groups (program_id, subject_group_id, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (program_id, subject_group_id)
     DO UPDATE SET sort_order = EXCLUDED.sort_order`,
    [programId, groupId, sortOrder]
  );
}

async function linkProgramSubject(
  client: import("pg").PoolClient,
  programId: string,
  subjectId: string
): Promise<void> {
  await client.query(
    `INSERT INTO program_subjects (program_id, subject_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [programId, subjectId]
  );
}

async function importMajor(client: import("pg").PoolClient, major: MajorRow): Promise<void> {
  const program = await ensureProgram(client, major.nganh);
  if (!program) return;

  console.log(`\n▶ ${major.nganh} (${program.code}) — ${major.groups.length} nhóm`);

  const subjectIdsForProgram = new Set<string>();

  for (const g of major.groups) {
    const whCode = warehouseGroupCode(program.code, g.code);
    const groupId = await upsertWarehouseGroup(
      client,
      whCode,
      g.label,
      g.sort_order,
      g.note ?? null
    );
    await linkProgramGroup(client, program.id, groupId, g.sort_order);

    for (const s of g.subjects) {
      const subjectId = await upsertSubject(client, s, groupId);
      subjectIdsForProgram.add(subjectId);
      await linkProgramSubject(client, program.id, subjectId);
    }
    console.log(`  + ${g.label} (${whCode}): ${g.subjects.length} môn`);
  }

  console.log(`  → Gán ${subjectIdsForProgram.size} môn cho ${program.code}`);
}

async function main() {
  const jsonPath = path.resolve(__dirname, "../src/data/nhom_mon_theo_nganh.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`Không tìm thấy file: ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as SourceFile;
  if (!Array.isArray(data.majors) || data.majors.length === 0) {
    console.error("File JSON không có majors[]");
    process.exit(1);
  }

  console.log("=== IMPORT NHÓM MÔN THEO NGÀNH (trừ CNTT) ===\n");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const major of data.majors) {
      await importMajor(client, major);
    }
    await client.query("COMMIT");
    console.log("\n✓ Import xong.");
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
