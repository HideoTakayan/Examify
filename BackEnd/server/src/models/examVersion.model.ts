import pool from "~/config/db";

export interface ExamVersion {
  id: string;
  exam_id: string;
  version_code: string;        // "D01"
  version_index: number;       // 0-based
  question_order: string[];   // [q3_id, q1_id, q2_id] — shuffled order
  option_maps: Record<string, Record<string, string>>; // { q_id: { A→B, B→A, ... } }
  created_at: string;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Deterministic version assignment: same student_id + exam_id → same version */
export function assignVersionIndex(studentId: string, totalVersions: number): number {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = ((hash << 5) - hash) + studentId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % totalVersions;
}

/** option_maps lưu map chữ cái (A→C) hay bản cũ lưu text hiển thị */
export function looksLikeOptionKeyMap(optionMap: Record<string, string>): boolean {
  const vals = Object.values(optionMap);
  if (vals.length === 0) return false;
  return vals.every((v) => /^[A-Za-z]$/.test(String(v).trim()));
}

/** Chuyển đáp án SV chọn trên màn hình (A/B/C/D) về đáp án gốc trong DB */
export function reverseAnswer(
  shuffledAnswer: string,
  optionMap: Record<string, string>,
  originalOptions?: Record<string, string> | null
): string {
  const pick = String(shuffledAnswer).trim();
  const pickUpper = pick.toUpperCase();

  if (looksLikeOptionKeyMap(optionMap)) {
    for (const [displayKey, originalKey] of Object.entries(optionMap)) {
      if (displayKey.toUpperCase() === pickUpper) {
        return String(originalKey).trim().toUpperCase();
      }
    }
    return pickUpper;
  }

  const shownText =
    optionMap[pick] ?? optionMap[pickUpper] ?? optionMap[pick.toLowerCase()];
  if (shownText && originalOptions) {
    for (const [origKey, text] of Object.entries(originalOptions)) {
      if (text === shownText) return origKey.toUpperCase();
    }
  }
  return pickUpper;
}

/** original_key (DB) → display key (ô SV thấy trên màn hình) */
export function originalKeyToDisplayKey(
  optionMap: Record<string, string>,
  originalKey: string | null | undefined
): string | null {
  if (originalKey == null || originalKey === "") return null;
  const target = String(Array.isArray(originalKey) ? originalKey[0] : originalKey)
    .trim()
    .toUpperCase();
  if (!/^[A-D]$/.test(target)) return null;
  if (!looksLikeOptionKeyMap(optionMap)) return target;
  for (const [displayKey, origKey] of Object.entries(optionMap)) {
    if (String(origKey).trim().toUpperCase() === target) {
      return displayKey.toUpperCase();
    }
  }
  return target;
}

/** display index ("0") hoặc question_id → map về question_id + đáp án gốc */
export function unshuffleAnswers(
  studentAnswers: Record<string, string | string[]>,
  questionOrder: string[],
  optionMaps: Record<string, Record<string, string>>,
  originalOptionsByQuestion?: Record<string, Record<string, string>>
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const orderSet = new Set(questionOrder);

  for (const [key, answer] of Object.entries(studentAnswers)) {
    let questionId: string | undefined;
    const idx = parseInt(key, 10);
    if (Number.isFinite(idx) && String(idx) === key.trim()) {
      questionId = questionOrder[idx];
    } else if (orderSet.has(key)) {
      questionId = key;
    }
    if (!questionId) continue;

    const qMap = optionMaps[questionId];
    const origOpts = originalOptionsByQuestion?.[questionId];
    if (qMap) {
      if (Array.isArray(answer)) {
        result[questionId] = answer.map((a) => reverseAnswer(a, qMap, origOpts));
      } else {
        result[questionId] = reverseAnswer(answer, qMap, origOpts);
      }
    } else {
      result[questionId] = answer;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------

export const createVersion = async (
  examId: string,
  versionCode: string,
  versionIndex: number,
  questionOrder: string[],
  optionMaps: Record<string, Record<string, string>>
): Promise<ExamVersion> => {
  const result = await pool.query(
    `INSERT INTO exam_versions (exam_id, version_code, version_index, question_order, option_maps)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb) RETURNING *`,
    [examId, versionCode, versionIndex, JSON.stringify(questionOrder), JSON.stringify(optionMaps)]
  );
  return result.rows[0] as ExamVersion;
};

export const getVersionsByExam = async (examId: string): Promise<ExamVersion[]> => {
  const result = await pool.query(
    `SELECT * FROM exam_versions WHERE exam_id = $1 ORDER BY version_index ASC`,
    [examId]
  );
  return result.rows as ExamVersion[];
};

export const getVersionByIndex = async (
  examId: string,
  index: number
): Promise<ExamVersion | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_versions WHERE exam_id = $1 AND version_index = $2`,
    [examId, index]
  );
  return (result.rows[0] as ExamVersion) ?? null;
};

export const getVersionByCode = async (
  examId: string,
  code: string
): Promise<ExamVersion | null> => {
  const result = await pool.query(
    `SELECT * FROM exam_versions WHERE exam_id = $1 AND version_code = $2`,
    [examId, code]
  );
  return (result.rows[0] as ExamVersion) ?? null;
};

/** Generate all version permutations for an exam */
export function generateVersionPool(
  questionIds: string[],
  questionOptions: Record<string, Record<string, string>>, // q_id → { A: "original", B: "original", ... }
  numVersions: number
): Array<{
  versionIndex: number;
  versionCode: string;
  questionOrder: string[];
  optionMaps: Record<string, Record<string, string>>;
}> {
  const pool: Array<{
    versionIndex: number;
    versionCode: string;
    questionOrder: string[];
    optionMaps: Record<string, Record<string, string>>;
  }> = [];

  for (let v = 0; v < numVersions; v++) {
    // Fisher-Yates shuffle with seeded-ish determinism per version
    const qOrder = shuffleArray([...questionIds], v);

    const optMaps: Record<string, Record<string, string>> = {};
    for (const qId of questionIds) {
      optMaps[qId] = shuffleOptions(questionOptions[qId] ?? { A: "A", B: "B", C: "C", D: "D" }, v + qId.charCodeAt(0));
    }

    pool.push({
      versionIndex: v,
      versionCode: `D${String(v + 1).padStart(2, "0")}`,
      questionOrder: qOrder,
      optionMaps: optMaps,
    });
  }
  return pool;
}

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 9301 + 49297) % 233280) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** display key (A,B,…) → original key whose text is shown under that label */
function shuffleOptions(
  options: Record<string, string>,
  seed: number
): Record<string, string> {
  const keys = Object.keys(options);
  if (keys.length === 0) return {};
  const shuffledOriginalKeys = shuffleArray(keys, seed);
  return keys.reduce((acc, displayKey, i) => {
    acc[displayKey] = shuffledOriginalKeys[i];
    return acc;
  }, {} as Record<string, string>);
}
