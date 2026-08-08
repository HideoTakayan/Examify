/**
 * So sánh semester/prerequisites giữa nguồn chuẩn (cntt1602_grades.json) và seed catalog.
 * Chạy: npx tsx scripts/audit-subject-semesters.ts
 */
import fs from "node:fs";
import path from "node:path";
import pool from "../src/config/db";

const ROOT = path.resolve(__dirname, "../../..");
const GRADES_PATH = path.join(ROOT, "cntt1602_grades.json");

type GradesSubject = {
  id: string;
  name: string;
  code: string;
  semester: number;
  prerequisites: string[];
};

function loadGrades(): GradesSubject[] {
  const raw = JSON.parse(fs.readFileSync(GRADES_PATH, "utf-8")) as {
    subjects: GradesSubject[];
  };
  return raw.subjects;
}

async function loadDb(): Promise<
  Array<{ code: string; name: string; semester: number; prereq_n: number }>
> {
  const r = await pool.query(
    `SELECT code, name, semester,
            COALESCE(cardinality(prerequisites), 0) AS prereq_n
     FROM subjects
     ORDER BY semester, name`
  );
  return r.rows;
}

function summarizeSemesters(label: string, items: { semester: number }[]) {
  const map = new Map<number, number>();
  for (const s of items) {
    map.set(s.semester, (map.get(s.semester) ?? 0) + 1);
  }
  console.log(`\n--- ${label} ---`);
  for (const [sem, n] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  semester ${sem}: ${n} môn`);
  }
}

async function main() {
  const grades = loadGrades();
  summarizeSemesters("cntt1602_grades.json", grades);

  const withTerm = grades.filter((s) => s.semester >= 1 && s.semester <= 8);
  const poolTerm = grades.filter((s) => s.semester === -1);
  console.log(`\nCó kỳ 1–8 rõ: ${withTerm.length} môn`);
  console.log(`Gộp kỳ -1 (chưa gắn HK): ${poolTerm.length} môn`);

  console.log("\n--- Chuỗi Toán (file grades) ---");
  const mathNames = [
    "Đại số tuyến tính",
    "Toán giải tích",
    "Toán rời rạc",
    "Xác suất thống kê",
  ];
  for (const key of mathNames) {
    const s = grades.find((x) => x.name.includes(key.slice(0, 12)));
    if (!s) continue;
    console.log(
      `  ${s.id} HK=${s.semester} | ${s.name.slice(0, 45)} | prereq: ${s.prerequisites.join(", ") || "(trống)"}`
    );
  }

  try {
    const db = await loadDb();
    summarizeSemesters("Neon DB (subjects)", db);

    const zero = db.filter((s) => s.semester === 0).length;
    const minus = db.filter((s) => s.semester === -1).length;
    const numbered = db.filter((s) => s.semester >= 1).length;
    console.log(`\nDB: semester=0 → ${zero} | -1 → ${minus} | >=1 → ${numbered}`);

    console.log("\n--- Chuỗi Toán (Neon) ---");
    for (const row of db.filter(
      (s) =>
        /toán|đại số|xác suất/i.test(s.name) && !/lý thuyết/i.test(s.name)
    )) {
      console.log(
        `  sem=${row.semester} ${row.code} | ${row.name.slice(0, 45)} | prereq_n=${row.prereq_n}`
      );
    }

    const mismatches: string[] = [];
    for (const g of grades) {
      const row = db.find(
        (d) => d.code === g.code || d.name === g.name
      );
      if (!row) {
        mismatches.push(`[thiếu DB] ${g.code} ${g.name}`);
        continue;
      }
      if (row.semester !== g.semester && !(row.semester === 0 && g.semester === -1)) {
        mismatches.push(
          `[semester] ${g.code}: file=${g.semester} db=${row.semester}`
        );
      }
    }
    if (mismatches.length) {
      console.log(`\n--- Lệch file ↔ DB (${mismatches.length}) ---`);
      mismatches.slice(0, 25).forEach((m) => console.log(" ", m));
      if (mismatches.length > 25) console.log(`  ... +${mismatches.length - 25}`);
    }
  } catch (e) {
    console.error("\nKhông kết nối DB:", (e as Error).message);
    console.log("(Chỉ xem phần cntt1602_grades.json ở trên.)");
  } finally {
    await pool.end().catch(() => undefined);
  }

  console.log(`
KẾT LUẬN NHANH:
- reseed-cntt-catalog gán semester mặc định = 0 → KHÔNG dùng được cho CTĐT theo kỳ.
- cntt1602_grades.json: ~${poolTerm.length} môn semester=-1 (chưa map HK thật).
- Cần nguồn CTĐT chính thức (crawl/PDF) → map year + term (1–8) + prerequisites.
`);
}

void main();
