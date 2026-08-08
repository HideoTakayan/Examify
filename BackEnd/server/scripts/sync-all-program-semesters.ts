/**
 * Đồng bộ semester cho tất cả ngành từ file crawl DaiNam.
 *
 * Quy tắc an toàn:
 * - Chỉ cập nhật `subjects.semester` khi mọi program đang dùng cùng 1 subject row
 *   đều map được sang curriculum và thống nhất cùng 1 semester.
 * - Nếu cùng 1 subject row được dùng bởi nhiều ngành nhưng semester khác nhau,
 *   script sẽ bỏ qua và báo conflict để tránh ghi đè sai.
 *
 * Chạy:
 *   npx tsx scripts/sync-all-program-semesters.ts
 */
import fs from "node:fs";
import path from "node:path";
import pool from "../src/config/db";

type CurriculumSubject = {
  code?: string;
  name?: string;
  semester?: number;
};

type CurriculumProgram = {
  program_code?: string;
  program_name?: string;
  subjects?: CurriculumSubject[];
};

type DbLinkedSubject = {
  program_id: string;
  program_code: string;
  program_name: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  semester: number;
};

type CurriculumLookup = {
  code: Map<string, number>;
  name: Map<string, number>;
};

type SubjectAggregate = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  currentSemester: number;
  linkedPrograms: Set<string>;
  matchedPrograms: Set<string>;
  candidateSemesters: Set<number>;
};

const CURRICULUM_FILE_CANDIDATES = [
  path.resolve(__dirname, "../../../scripts/dainam_subjects.json"),
  path.resolve(
    "C:/Users/admin/OneDrive/Luu drive/OneDrive/May tinh/craw/dainam_subjects.json"
  ),
  path.resolve(
    "C:/Users/admin/OneDrive/Lưu drive/OneDrive/Máy tính/craw/dainam_subjects.json"
  ),
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value: string): string {
  return value
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "");
}

function loadCurriculumPrograms(): CurriculumProgram[] {
  for (const candidate of CURRICULUM_FILE_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    const raw = JSON.parse(fs.readFileSync(candidate, "utf8")) as
      | CurriculumProgram[]
      | CurriculumProgram;
    const programs = Array.isArray(raw) ? raw : [raw];
    if (programs.length > 0) return programs;
  }
  throw new Error("Không tìm thấy dainam_subjects.json");
}

function buildCurriculumLookup(program: CurriculumProgram): CurriculumLookup {
  const code = new Map<string, number>();
  const name = new Map<string, number>();

  for (const subject of program.subjects ?? []) {
    if (typeof subject.semester !== "number") continue;

    const normalizedCode = normalizeCode(subject.code ?? "");
    if (normalizedCode) code.set(normalizedCode, subject.semester);

    const normalizedName = normalizeText(subject.name ?? "");
    if (normalizedName) name.set(normalizedName, subject.semester);
  }

  return { code, name };
}

async function loadDbLinkedSubjects(): Promise<DbLinkedSubject[]> {
  const result = await pool.query<DbLinkedSubject>(
    `SELECT
        p.id AS program_id,
        p.code AS program_code,
        p.name AS program_name,
        s.id AS subject_id,
        COALESCE(s.code, '') AS subject_code,
        s.name AS subject_name,
        COALESCE(s.semester, 0) AS semester
     FROM programs p
     JOIN program_subjects ps ON ps.program_id = p.id
     JOIN subjects s ON s.id = ps.subject_id
     ORDER BY p.name, s.name`
  );
  return result.rows;
}

async function main() {
  const curriculumPrograms = loadCurriculumPrograms();
  const curriculumByProgramName = new Map<string, CurriculumLookup>();
  for (const program of curriculumPrograms) {
    const normalizedName = normalizeText(program.program_name ?? "");
    if (!normalizedName) continue;
    curriculumByProgramName.set(normalizedName, buildCurriculumLookup(program));
  }

  const rows = await loadDbLinkedSubjects();
  const statsByProgram = new Map<
    string,
    { linked: number; matched: number; missingCurriculum: number; noSubjectMatch: number }
  >();
  const subjectAggregates = new Map<string, SubjectAggregate>();

  for (const row of rows) {
    const programKey = `${row.program_code} | ${row.program_name}`;
    const programStat =
      statsByProgram.get(programKey) ??
      { linked: 0, matched: 0, missingCurriculum: 0, noSubjectMatch: 0 };
    programStat.linked += 1;
    statsByProgram.set(programKey, programStat);

    const aggregate =
      subjectAggregates.get(row.subject_id) ??
      {
        subjectId: row.subject_id,
        subjectCode: row.subject_code,
        subjectName: row.subject_name,
        currentSemester: Number(row.semester) || 0,
        linkedPrograms: new Set<string>(),
        matchedPrograms: new Set<string>(),
        candidateSemesters: new Set<number>(),
      };
    aggregate.linkedPrograms.add(programKey);
    subjectAggregates.set(row.subject_id, aggregate);

    const curriculum = curriculumByProgramName.get(normalizeText(row.program_name));
    if (!curriculum) {
      programStat.missingCurriculum += 1;
      continue;
    }

    const codeSemester = curriculum.code.get(normalizeCode(row.subject_code));
    const nameSemester = curriculum.name.get(normalizeText(row.subject_name));
    const semester = codeSemester ?? nameSemester;
    if (semester === undefined) {
      programStat.noSubjectMatch += 1;
      continue;
    }

    programStat.matched += 1;
    aggregate.matchedPrograms.add(programKey);
    aggregate.candidateSemesters.add(semester);
  }

  const safeUpdates: Array<{ subjectId: string; semester: number; code: string; name: string }> = [];
  const conflicts: string[] = [];
  const partials: string[] = [];

  for (const aggregate of subjectAggregates.values()) {
    if (aggregate.matchedPrograms.size === 0) continue;

    if (aggregate.linkedPrograms.size !== aggregate.matchedPrograms.size) {
      partials.push(
        `${aggregate.subjectCode || "(no-code)"} | ${aggregate.subjectName} | matched ${aggregate.matchedPrograms.size}/${aggregate.linkedPrograms.size} programs`
      );
      continue;
    }

    if (aggregate.candidateSemesters.size !== 1) {
      conflicts.push(
        `${aggregate.subjectCode || "(no-code)"} | ${aggregate.subjectName} | semesters: ${[...aggregate.candidateSemesters].sort((a, b) => a - b).join(", ")}`
      );
      continue;
    }

    const [targetSemester] = [...aggregate.candidateSemesters];
    if (targetSemester !== aggregate.currentSemester) {
      safeUpdates.push({
        subjectId: aggregate.subjectId,
        semester: targetSemester,
        code: aggregate.subjectCode,
        name: aggregate.subjectName,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of safeUpdates) {
      await client.query(`UPDATE subjects SET semester = $2 WHERE id = $1`, [
        item.subjectId,
        item.semester,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log("=== SYNC ALL PROGRAM SEMESTERS ===\n");
  console.log(`Programs in curriculum file: ${curriculumByProgramName.size}`);
  console.log(`Linked program-subject rows scanned: ${rows.length}`);
  console.log(`Safe subject updates applied: ${safeUpdates.length}`);
  console.log(`Shared-subject conflicts skipped: ${conflicts.length}`);
  console.log(`Partial-coverage subjects skipped: ${partials.length}`);

  console.log("\n--- Program coverage ---");
  for (const [program, stat] of [...statsByProgram.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "vi")
  )) {
    if (stat.linked === 0) continue;
    console.log(
      `${program}: matched ${stat.matched}/${stat.linked}, missing-curriculum=${stat.missingCurriculum}, no-subject-match=${stat.noSubjectMatch}`
    );
  }

  if (safeUpdates.length > 0) {
    console.log("\n--- Sample updates ---");
    for (const item of safeUpdates.slice(0, 20)) {
      console.log(`  ${item.code || "(no-code)"} | ${item.name} -> semester ${item.semester}`);
    }
    if (safeUpdates.length > 20) {
      console.log(`  ... +${safeUpdates.length - 20} more`);
    }
  }

  if (conflicts.length > 0) {
    console.log("\n--- Shared subject conflicts (sample) ---");
    for (const line of conflicts.slice(0, 20)) {
      console.log(`  ${line}`);
    }
    if (conflicts.length > 20) {
      console.log(`  ... +${conflicts.length - 20} more`);
    }
  }

  if (partials.length > 0) {
    console.log("\n--- Partial coverage skipped (sample) ---");
    for (const line of partials.slice(0, 20)) {
      console.log(`  ${line}`);
    }
    if (partials.length > 20) {
      console.log(`  ... +${partials.length - 20} more`);
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
