/**
 * Sửa câu TN đã seed sai: correct_answer "0"–"3" → "A"–"D", options mảng → {A,B,C,D}.
 * Usage: npx ts-node -r tsconfig-paths/register scripts/fix-demo-mcq-format.ts
 */
import pool from "~/config/db";

const KEYS = ["A", "B", "C", "D"];

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }
  return v as T;
}

function toOptionsRecord(raw: unknown): Record<string, string> | null {
  if (raw == null) return null;
  const parsed = parseJson<unknown>(raw, raw);
  if (Array.isArray(parsed)) {
    const out: Record<string, string> = {};
    for (let i = 0; i < Math.min(4, parsed.length); i++) {
      out[KEYS[i]] = String(parsed[i] ?? "");
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of KEYS) {
      if (obj[k] != null) out[k] = String(obj[k]);
    }
    if (Object.keys(out).length >= 2) return out;
  }
  return null;
}

function toCorrectLetter(raw: unknown, options: Record<string, string> | null): string | null {
  if (raw == null) return null;
  const parsed = parseJson<unknown>(raw, raw);
  const s = String(Array.isArray(parsed) ? parsed[0] : parsed).trim().toUpperCase();
  if (/^[A-D]$/.test(s)) return s;
  const n = Number(s);
  if (Number.isInteger(n) && n >= 0 && n <= 3) return KEYS[n];
  return null;
}

async function main() {
  const r = await pool.query(
    `SELECT id, options, correct_answer FROM questions WHERE question_type = 'mcq'`
  );
  let fixed = 0;
  for (const row of r.rows) {
    const options = toOptionsRecord(row.options);
    const letter = toCorrectLetter(row.correct_answer, options);
    if (!options || !letter) continue;

    const curOpts = toOptionsRecord(row.options);
    const curLetter = toCorrectLetter(row.correct_answer, curOpts);
    const needsOpts =
      !curOpts ||
      Array.isArray(parseJson(row.options, row.options)) ||
      curLetter !== letter ||
      JSON.stringify(curOpts) !== JSON.stringify(options);

    const storedLetter = toCorrectLetter(row.correct_answer, null);
    const needsAns = storedLetter !== letter;

    if (!needsOpts && !needsAns) continue;

    await pool.query(
      `UPDATE questions SET options = $1::jsonb, correct_answer = $2::jsonb WHERE id = $3`,
      [JSON.stringify(options), JSON.stringify(letter), row.id]
    );
    fixed++;
  }
  console.log(`Đã sửa ${fixed}/${r.rows.length} câu trắc nghiệm.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
