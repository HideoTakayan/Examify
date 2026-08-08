/**
 * Seed demo bảo vệ đồ án:
 * - 6 môn, mỗi môn 1 bài thi với 2 mã đề (D01, D02) — 50 câu/mã (40 TN + 10 TL).
 * Usage: npx ts-node -r tsconfig-paths/register scripts/seed-demo-exams.ts
 */
import pool from "~/config/db";
import { getQuestionsByExam } from "~/models/question.model";
import { getExamById } from "~/models/exam.model";
import {
  getVersionsByExam,
  createVersion,
  generateVersionPool,
} from "~/models/examVersion.model";

const SUBJECTS = [
  { code: "NET301", name: "Lập trình mạng", credits: 3, category: "specialized" },
  { code: "BIS401", name: "Ứng dụng CNTT trong doanh nghiệp", credits: 3, category: "specialized" },
  { code: "PRA601", name: "Thực tập CNTT6: Cài đặt, cấu hình máy chủ, mạng, triển khai ứng dụng", credits: 4, category: "practice" },
  { code: "ENG204", name: "Tiếng Anh P4", credits: 3, category: "general" },
  { code: "LAW101", name: "Pháp luật đại cương", credits: 2, category: "general" },
  { code: "MAT102", name: "Toán giải tích", credits: 3, category: "foundation" },
];

type MCQ = {
  content: string;
  options: string[];
  correct: number;
  explanation?: string;
};

type Essay = {
  content: string;
  explanation?: string;
  points?: number;
};

type QuestionSet = { mcqs: MCQ[]; essays: Essay[] };

const MCQ_KEYS = ["A", "B", "C", "D"] as const;

function mcqOptionsRecord(options: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < Math.min(4, options.length); i++) {
    out[MCQ_KEYS[i]] = options[i];
  }
  return out;
}

function mcqCorrectLetter(correctIndex: number): string {
  return MCQ_KEYS[correctIndex] ?? "A";
}

import { netQ1, netQ2 } from "./questions/net301";
import { bisQ1, bisQ2 } from "./questions/bis401";
import { praQ1, praQ2 } from "./questions/pra601";
import { engQ1, engQ2 } from "./questions/eng204";
import { lawQ1, lawQ2 } from "./questions/law101";
import { matQ1, matQ2 } from "./questions/mat102";

/** Mỗi môn: 1 bài thi, 2 mã đề */
const SUBJECT_EXAMS: Array<{
  subjectCode: string;
  title: string;
  d01: QuestionSet;
  d02: QuestionSet;
}> = [
  {
    subjectCode: "NET301",
    title: "Lập trình mạng - Kiểm tra cuối kỳ",
    d01: netQ1,
    d02: netQ2,
  },
  {
    subjectCode: "BIS401",
    title: "Ứng dụng CNTT trong doanh nghiệp - Kiểm tra cuối kỳ",
    d01: bisQ1,
    d02: bisQ2,
  },
  {
    subjectCode: "PRA601",
    title: "Thực tập CNTT6 - Kiểm tra cuối kỳ",
    d01: praQ1,
    d02: praQ2,
  },
  {
    subjectCode: "ENG204",
    title: "Tiếng Anh P4 - Kiểm tra cuối kỳ",
    d01: engQ1,
    d02: engQ2,
  },
  {
    subjectCode: "LAW101",
    title: "Pháp luật đại cương - Kiểm tra cuối kỳ",
    d01: lawQ1,
    d02: lawQ2,
  },
  {
    subjectCode: "MAT102",
    title: "Toán giải tích - Kiểm tra cuối kỳ",
    d01: matQ1,
    d02: matQ2,
  },
];

const NUM_VERSIONS = 2;
const MCQ_PER_VERSION = 40;
const ESSAY_PER_VERSION = 10;

async function insertVersionQuestions(
  examId: string,
  versionIndex: number,
  set: QuestionSet
): Promise<void> {
  const mcqs = set.mcqs.slice(0, MCQ_PER_VERSION);
  const essays = set.essays.slice(0, ESSAY_PER_VERSION);
  let order = 1;

  for (const q of mcqs) {
    await pool.query(
      `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order, explanation, version_index)
       VALUES ($1, $2, 'mcq', $3, $4, 0.2, $5, $6, $7)`,
      [
        examId,
        q.content,
        JSON.stringify(mcqOptionsRecord(q.options)),
        JSON.stringify(mcqCorrectLetter(q.correct)),
        order++,
        q.explanation ?? null,
        versionIndex,
      ]
    );
  }
  for (const q of essays) {
    await pool.query(
      `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order, explanation, version_index)
       VALUES ($1, $2, 'essay', NULL, NULL, $3, $4, $5, $6)`,
      [examId, q.content, q.points ?? 1, order++, q.explanation ?? null, versionIndex]
    );
  }
}

async function ensureVersionPoolForExam(examId: string): Promise<void> {
  const existing = await getVersionsByExam(examId);
  if (existing.length > 0) return;

  const exam = await getExamById(examId);
  if (!exam) return;

  const questions = await getQuestionsByExam(examId);
  if (questions.length === 0) return;

  const numVersions = exam.num_versions ?? NUM_VERSIONS;

  for (let v = 0; v < numVersions; v += 1) {
    const versionQuestions = questions.filter((q) => (q.version_index ?? 0) === v);
    if (versionQuestions.length === 0) continue;

    const questionIds = versionQuestions.map((q) => q.id);
    const questionOptions: Record<string, Record<string, string>> = {};
    for (const q of versionQuestions) {
      questionOptions[q.id] = q.options
        ? { ...q.options }
        : { A: "A", B: "B", C: "C", D: "D" };
    }

    const poolVersions = generateVersionPool(questionIds, questionOptions, 1);
    const shuffled = poolVersions[0];
    const versionCode = `D${String(v + 1).padStart(2, "0")}`;
    await createVersion(examId, versionCode, v, shuffled.questionOrder, shuffled.optionMaps);
  }
}

async function main() {
  console.log("=== Seed demo: 6 bài thi × 2 mã đề (D01, D02) ===\n");

  console.log("1. Xóa data cũ...");
  await pool.query(`DELETE FROM exam_session_autosaves`);
  await pool.query(`DELETE FROM exam_integrity_events`);
  await pool.query(`DELETE FROM exam_sessions`);
  await pool.query(`DELETE FROM exam_versions`);
  await pool.query(`DELETE FROM questions`);
  await pool.query(`DELETE FROM question_bank`);
  await pool.query(`DELETE FROM exam_collaborators`);
  await pool.query(`DELETE FROM exams`);
  await pool.query(
    `DELETE FROM accounts WHERE role = 'student'
     AND email NOT LIKE '%@student.local'
     AND email NOT IN ('sv01@system.local','sv02@system.local','sv03@system.local','sv04@system.local','sv05@system.local')`
  );
  console.log("   ✓ Đã xóa exams, questions, sessions cũ");

  console.log("2. Tạo/cập nhật 6 môn học...");
  const progR = await pool.query<{ id: string }>(
    `SELECT id FROM programs WHERE code = 'CNTT' LIMIT 1`
  );
  const programId: string | null = progR.rows[0]?.id ?? null;

  const subjectIds = new Map<string, string>();
  for (const s of SUBJECTS) {
    const byCode = await pool.query<{ id: string }>(
      `SELECT id FROM subjects WHERE code = $1 LIMIT 1`,
      [s.code]
    );
    if (byCode.rows[0]) {
      subjectIds.set(s.code, byCode.rows[0].id);
      continue;
    }
    const byName = await pool.query<{ id: string }>(
      programId
        ? `SELECT id FROM subjects WHERE program_id = $1 AND name = $2 LIMIT 1`
        : `SELECT id FROM subjects WHERE name = $1 LIMIT 1`,
      programId ? [programId, s.name] : [s.name]
    );
    if (byName.rows[0]) {
      subjectIds.set(s.code, byName.rows[0].id);
      continue;
    }
    const r = await pool.query<{ id: string }>(
      `INSERT INTO subjects (name, code, credits, category, program_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [s.name, s.code, s.credits, s.category, programId]
    );
    subjectIds.set(s.code, r.rows[0].id);
  }

  const teacherR = await pool.query(
    `SELECT id FROM accounts WHERE email = 'gv01@system.local' LIMIT 1`
  );
  if (!teacherR.rows[0]) {
    console.error("Không tìm thấy GV gv01@system.local!");
    process.exit(1);
  }
  const teacherId = teacherR.rows[0].id;

  const acR = await pool.query(
    `SELECT id FROM admin_classes WHERE display_name = 'DEMO CLASS' LIMIT 1`
  );
  if (!acR.rows[0]) {
    console.error("Không tìm thấy lớp DEMO CLASS!");
    process.exit(1);
  }
  const adminClassId = acR.rows[0].id;

  console.log("3. Tạo 6 bài thi (mỗi bài 2 mã đề D01 + D02)...");
  for (const exam of SUBJECT_EXAMS) {
    const subjectId = subjectIds.get(exam.subjectCode);
    if (!subjectId) continue;

    const opensAt = new Date();
    opensAt.setDate(opensAt.getDate() + 7);
    opensAt.setHours(8, 0, 0, 0);
    const endsAt = new Date(opensAt.getTime() + 3 * 60 * 60 * 1000);

    const examR = await pool.query(
      `INSERT INTO exams (title, description, duration_min, created_by, admin_class_id, subject_id, num_versions, opens_at, ends_at, closes_at)
       VALUES ($1, $2, 90, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
      [
        exam.title,
        `${exam.title} — 2 mã đề (D01, D02), mỗi mã 40 câu trắc nghiệm + 10 câu tự luận`,
        teacherId,
        adminClassId,
        subjectId,
        NUM_VERSIONS,
        opensAt.toISOString(),
        endsAt.toISOString(),
      ]
    );
    const examId = examR.rows[0].id;

    await insertVersionQuestions(examId, 0, exam.d01);
    await insertVersionQuestions(examId, 1, exam.d02);
    await ensureVersionPoolForExam(examId);

    const c0 = exam.d01.mcqs.length;
    const c1 = exam.d02.mcqs.length;
    console.log(
      `   ✓ ${exam.title}: D01 (${Math.min(c0, MCQ_PER_VERSION)} TN + ${exam.d01.essays.length} TL), D02 (${Math.min(c1, MCQ_PER_VERSION)} TN + ${exam.d02.essays.length} TL)`
    );
  }

  console.log("\n=== Seed hoàn tất! ===");
  console.log("6 bài thi × 2 mã đề = 12 mã đề, ~600 câu hỏi");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
