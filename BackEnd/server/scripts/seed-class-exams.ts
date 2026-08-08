/**
 * Tạo ~10 đề thi cho một lớp hành chính (mặc định CNT 16-07):
 * - Mỗi đề: 2 mã đề (D01/D02), 40 TN + 10 TL / mã, thang 10
 * - Lịch opens_at / ends_at (khung 3 giờ), không xóa đề cũ
 *
 * Usage (từ BackEnd/server):
 *   npm run seed:class-exams
 *   npm run seed:class-exams -- --class "CNT 16-07"
 *   npm run seed:class-exams -- --class "16-07" --count 10
 */
import pool from "~/config/db";
import { getQuestionsByExam } from "~/models/question.model";
import { getExamById } from "~/models/exam.model";
import {
  getVersionsByExam,
  createVersion,
  generateVersionPool,
} from "~/models/examVersion.model";
import { getProgramSubjectIds } from "~/services/subjectCatalog.service";

const EXAM_COUNT_DEFAULT = 10;
const EXAM_WINDOW_HOURS = 3;
const NUM_VERSIONS = 2;
const MCQ_PER_VERSION = 40;
const ESSAY_PER_VERSION = 10;
const MCQ_POINTS = 0.2; // 40 × 0.2 = 8
const ESSAY_POINTS = 0.2; // 10 × 0.2 = 2 → tổng 10

const MCQ_KEYS = ["A", "B", "C", "D"] as const;

type SubjectRow = { id: string; name: string; code: string | null };

function parseArgs(): { classPattern: string; count: number } {
  const idx = process.argv.indexOf("--class");
  const classPattern =
    idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : "16-07";
  const countIdx = process.argv.indexOf("--count");
  const count =
    countIdx >= 0 && process.argv[countIdx + 1]
      ? Math.max(1, Math.min(20, Number(process.argv[countIdx + 1]) || EXAM_COUNT_DEFAULT))
      : EXAM_COUNT_DEFAULT;
  return { classPattern, count };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mcqOptionsRecord(options: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < Math.min(4, options.length); i++) {
    out[MCQ_KEYS[i]] = options[i];
  }
  return out;
}

function buildSchedule(slotIndex: number, durationMin: number) {
  const opens = new Date();
  opens.setDate(opens.getDate() + 3 + slotIndex * 2);
  opens.setHours(8 + (slotIndex % 3), 0, 0, 0);
  const ends = new Date(opens.getTime() + EXAM_WINDOW_HOURS * 60 * 60 * 1000);
  return {
    opens_at: opens.toISOString(),
    ends_at: ends.toISOString(),
    closes_at: ends.toISOString(),
    duration_min: durationMin,
  };
}

function generateMcq(subjectName: string, index: number, version: number) {
  const correct = (index + version) % 4;
  const options = MCQ_KEYS.map(
    (k) => `${k}. Ý ${k} — ${subjectName} (câu ${index}, mã ${version + 1})`
  );
  return {
    content: `[TN] Câu ${index} (mã D0${version + 1}): Chọn phương án đúng về "${subjectName}".`,
    options,
    correct: MCQ_KEYS[correct],
  };
}

function generateEssay(subjectName: string, index: number, version: number) {
  return {
    content: `[TL] Câu ${index} (mã D0${version + 1}): Trình bày ngắn gọn một nội dung trọng tâm của môn "${subjectName}" (tối thiểu 150 từ).`,
  };
}

async function insertExamQuestions(
  examId: string,
  subjectName: string,
  versionIndex: number
): Promise<void> {
  let order = 1;
  for (let i = 1; i <= MCQ_PER_VERSION; i++) {
    const q = generateMcq(subjectName, i, versionIndex);
    await pool.query(
      `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order, version_index)
       VALUES ($1, $2, 'mcq', $3, $4, $5, $6, $7)`,
      [
        examId,
        q.content,
        JSON.stringify(mcqOptionsRecord(q.options)),
        JSON.stringify(q.correct),
        MCQ_POINTS,
        order++,
        versionIndex,
      ]
    );
  }
  for (let i = 1; i <= ESSAY_PER_VERSION; i++) {
    const q = generateEssay(subjectName, i, versionIndex);
    await pool.query(
      `INSERT INTO questions (exam_id, content, question_type, points, display_order, version_index)
       VALUES ($1, $2, 'essay', $3, $4, $5)`,
      [examId, q.content, ESSAY_POINTS, order++, versionIndex]
    );
  }
}

async function ensureVersionPoolForExam(examId: string): Promise<void> {
  const existing = await getVersionsByExam(examId);
  if (existing.length >= NUM_VERSIONS) return;

  const exam = await getExamById(examId);
  if (!exam) return;

  for (let v = 0; v < NUM_VERSIONS; v += 1) {
    if (existing.some((row) => (row.version_index ?? 0) === v)) continue;

    const questions = await getQuestionsByExam(examId);
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
  const { classPattern, count: EXAM_COUNT } = parseArgs();
  console.log(`=== Seed ${EXAM_COUNT} đề thi cho lớp "${classPattern}" ===\n`);

  const acR = await pool.query<{
    id: string;
    display_name: string;
    program_id: string | null;
    manager_teacher_id: string | null;
    program_code: string | null;
  }>(
    `SELECT ac.id, ac.display_name, ac.program_id, ac.manager_teacher_id, p.code AS program_code
     FROM admin_classes ac
     LEFT JOIN programs p ON p.id = ac.program_id
     WHERE ac.display_name ILIKE $1
     ORDER BY ac.display_name
     LIMIT 1`,
    [`%${classPattern}%`]
  );

  const adminClass = acR.rows[0];
  if (!adminClass) {
    console.error(`Không tìm thấy lớp hành chính khớp "${classPattern}"`);
    process.exit(1);
  }
  if (!adminClass.program_id) {
    console.error(`Lớp ${adminClass.display_name} chưa gán chuyên ngành (program_id)`);
    process.exit(1);
  }

  let teacherId = adminClass.manager_teacher_id;
  if (!teacherId) {
    const fallback = await pool.query<{ id: string }>(
      `SELECT id FROM accounts WHERE role = 'teacher' AND is_active = true LIMIT 1`
    );
    teacherId = fallback.rows[0]?.id ?? null;
  }
  if (!teacherId) {
    console.error("Không có giáo viên để gán created_by");
    process.exit(1);
  }

  const programSubjectIds = await getProgramSubjectIds(adminClass.program_id);
  if (programSubjectIds.length === 0) {
    console.error(
      `Chưa có môn trong CTĐT ${adminClass.program_code ?? adminClass.program_id}. Gán nhóm môn trước.`
    );
    process.exit(1);
  }

  const subjR = await pool.query<SubjectRow>(
    `SELECT id, name, code FROM subjects
     WHERE id = ANY($1::uuid[]) AND is_active = true
     ORDER BY name ASC`,
    [programSubjectIds]
  );
  if (subjR.rows.length === 0) {
    console.error("Không tìm thấy môn học active trong CTĐT.");
    process.exit(1);
  }

  const usedSubjectIds = new Set<string>();
  const existingExams = await pool.query<{ subject_id: string | null }>(
    `SELECT DISTINCT subject_id FROM exams
     WHERE admin_class_id = $1 AND subject_id IS NOT NULL`,
    [adminClass.id]
  );
  for (const row of existingExams.rows) {
    if (row.subject_id) usedSubjectIds.add(row.subject_id);
  }

  const available = subjR.rows.filter((s) => !usedSubjectIds.has(s.id));
  const poolSubjects = shuffle(available.length >= EXAM_COUNT ? available : subjR.rows);
  const picked: SubjectRow[] = [];
  for (const s of poolSubjects) {
    if (picked.length >= EXAM_COUNT) break;
    if (!picked.some((p) => p.id === s.id)) picked.push(s);
  }
  while (picked.length < EXAM_COUNT && subjR.rows.length > 0) {
    for (const s of shuffle(subjR.rows)) {
      if (picked.length >= EXAM_COUNT) break;
      picked.push(s);
    }
  }

  console.log(`Lớp:     ${adminClass.display_name} (${adminClass.id})`);
  console.log(`Ngành:   ${adminClass.program_code ?? adminClass.program_id}`);
  console.log(`GV:      ${teacherId}`);
  console.log(`Môn CTĐT: ${subjR.rows.length} — tạo ${picked.length} đề\n`);

  let created = 0;
  for (let i = 0; i < picked.length; i++) {
    const subject = picked[i];
    const schedule = buildSchedule(i, EXAM_WINDOW_HOURS * 60);
    const dateLabel = new Date(schedule.opens_at).toLocaleDateString("vi-VN");
    const title = `${subject.name} — Kiểm tra cuối kỳ (${dateLabel})`;

    const dup = await pool.query(
      `SELECT id FROM exams
       WHERE admin_class_id = $1 AND subject_id = $2 AND title = $3
       LIMIT 1`,
      [adminClass.id, subject.id, title]
    );
    if (dup.rows[0]) {
      console.log(`   ⊘ Bỏ qua (đã có): ${title}`);
      continue;
    }

    const examR = await pool.query<{ id: string }>(
      `INSERT INTO exams (
         title, description, admin_class_id, subject_id, created_by,
         duration_min, num_versions, closes_at, opens_at, ends_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        title,
        `${title} — 2 mã đề (D01, D02), mỗi mã ${MCQ_PER_VERSION} TN + ${ESSAY_PER_VERSION} TL (thang 10).`,
        adminClass.id,
        subject.id,
        teacherId,
        schedule.duration_min,
        NUM_VERSIONS,
        schedule.closes_at,
        schedule.opens_at,
        schedule.ends_at,
      ]
    );
    const examId = examR.rows[0].id;

    await pool.query(
      `INSERT INTO exam_collaborators (exam_id, teacher_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (exam_id, teacher_id) DO NOTHING`,
      [examId, teacherId]
    );

    for (let v = 0; v < NUM_VERSIONS; v++) {
      await insertExamQuestions(examId, subject.name, v);
    }
    await ensureVersionPoolForExam(examId);

    created++;
    const opensLocal = new Date(schedule.opens_at).toLocaleString("vi-VN");
    const endsLocal = new Date(schedule.ends_at).toLocaleString("vi-VN");
    console.log(
      `   ✓ [${created}/${EXAM_COUNT}] ${title}\n      Mở: ${opensLocal}  →  Đóng: ${endsLocal}`
    );
  }

  console.log(`\n=== Hoàn tất: thêm ${created} đề cho ${adminClass.display_name} ===`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
