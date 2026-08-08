/**
 * Thêm 20 bài thi (môn ngẫu nhiên từ catalog), mỗi bài 100 câu trắc nghiệm (thang 10),
 * kèm lịch opens_at / ends_at / closes_at. Không xóa bài thi hiện có.
 *
 * Usage (từ BackEnd/server):
 *   npx ts-node -r tsconfig-paths/register scripts/seed-random-exams.ts
 */
import pool from "~/config/db";
import { getQuestionsByExam } from "~/models/question.model";
import { getExamById } from "~/models/exam.model";
import { getProgramSubjectIds } from "~/services/subjectCatalog.service";
import {
  getVersionsByExam,
  createVersion,
  generateVersionPool,
} from "~/models/examVersion.model";

const EXAM_COUNT = 20;
const QUESTIONS_PER_EXAM = 100;
const POINTS_PER_MCQ = 0.1; // 100 × 0.1 = 10 điểm
const EXAM_WINDOW_HOURS = 3;
const DURATION_MIN = 100;

const MCQ_KEYS = ["A", "B", "C", "D"] as const;

type SubjectRow = { id: string; name: string; code: string | null };

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

function buildSchedule(slotIndex: number): {
  opens_at: string;
  ends_at: string;
  closes_at: string;
  duration_min: number;
} {
  const opens = new Date();
  opens.setDate(opens.getDate() + 2 + slotIndex * 3);
  opens.setHours(8 + (slotIndex % 4), 0, 0, 0);
  const ends = new Date(opens.getTime() + EXAM_WINDOW_HOURS * 60 * 60 * 1000);
  return {
    opens_at: opens.toISOString(),
    ends_at: ends.toISOString(),
    closes_at: ends.toISOString(),
    duration_min: DURATION_MIN,
  };
}

function generateMcqContent(subjectName: string, index: number): {
  content: string;
  options: string[];
  correct: number;
} {
  const correct = index % 4;
  const options = [
    `Đáp án A — ${subjectName} (câu ${index})`,
    `Đáp án B — ${subjectName} (câu ${index})`,
    `Đáp án C — ${subjectName} (câu ${index})`,
    `Đáp án D — ${subjectName} (câu ${index})`,
  ];
  return {
    content: `Câu ${index}: Theo nội dung môn "${subjectName}", phương án nào đúng nhất?`,
    options,
    correct,
  };
}

async function insertMcqQuestions(
  examId: string,
  subjectName: string,
  versionIndex: number
): Promise<void> {
  for (let i = 1; i <= QUESTIONS_PER_EXAM; i++) {
    const q = generateMcqContent(subjectName, i);
    await pool.query(
      `INSERT INTO questions (exam_id, content, question_type, options, correct_answer, points, display_order, version_index)
       VALUES ($1, $2, 'mcq', $3, $4, $5, $6, $7)`,
      [
        examId,
        q.content,
        JSON.stringify(mcqOptionsRecord(q.options)),
        JSON.stringify(MCQ_KEYS[q.correct]),
        POINTS_PER_MCQ,
        i,
        versionIndex,
      ]
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

  const versionQuestions = questions.filter((q) => (q.version_index ?? 0) === 0);
  if (versionQuestions.length === 0) return;

  const questionIds = versionQuestions.map((q) => q.id);
  const questionOptions: Record<string, Record<string, string>> = {};
  for (const q of versionQuestions) {
    questionOptions[q.id] = q.options ? { ...q.options } : { A: "A", B: "B", C: "C", D: "D" };
  }

  const poolVersions = generateVersionPool(questionIds, questionOptions, 1);
  const shuffled = poolVersions[0];
  await createVersion(examId, "D01", 0, shuffled.questionOrder, shuffled.optionMaps);
}

async function main() {
  console.log(`=== Seed ${EXAM_COUNT} bài thi (100 câu, có lịch) — không xóa data cũ ===\n`);

  const teacherR = await pool.query<{ id: string }>(
    `SELECT id FROM accounts WHERE email = 'gv01@system.local' LIMIT 1`
  );
  if (!teacherR.rows[0]) {
    console.error("Không tìm thấy GV gv01@system.local");
    process.exit(1);
  }
  const teacherId = teacherR.rows[0].id;

  const acR = await pool.query<{ id: string }>(
    `SELECT id FROM admin_classes WHERE display_name ILIKE '%CNTT%16%02%' LIMIT 1`
  );
  if (!acR.rows[0]) {
    console.error("Không tìm thấy lớp hành chính DEMO CLASS");
    process.exit(1);
  }
  const adminClassId = acR.rows[0].id;

  const classR = await pool.query<{ id: string }>(
    `SELECT id FROM classes
     WHERE teacher_id = $1
     ORDER BY created_at DESC NULLS LAST
     LIMIT 1`,
    [teacherId]
  );
  const classId = classR.rows[0]?.id ?? null;

  const programSubjectIds = await getProgramSubjectIds();
  if (programSubjectIds.length === 0) {
    console.error("Chưa có môn CTĐT CNTT. Chạy reseed/sync catalog trước.");
    process.exit(1);
  }

  const subjR = await pool.query<SubjectRow>(
    `SELECT id, name, code FROM subjects
     WHERE id = ANY($1::uuid[])
     ORDER BY name ASC`,
    [programSubjectIds]
  );
  if (subjR.rows.length === 0) {
    console.error("Không tìm thấy môn CTĐT trong bảng subjects.");
    process.exit(1);
  }
  console.log(`Chọn môn từ CTĐT CNTT: ${subjR.rows.length} môn (picker-catalog)\n`);

  const picked: SubjectRow[] = [];
  const shuffled = shuffle(subjR.rows);
  while (picked.length < EXAM_COUNT) {
    for (const s of shuffled) {
      if (picked.length >= EXAM_COUNT) break;
      picked.push(s);
    }
  }

  let created = 0;
  for (let i = 0; i < EXAM_COUNT; i++) {
    const subject = picked[i];
    const schedule = buildSchedule(i);
    const title = `${subject.name} — Kiểm tra ${i + 1} (${new Date(schedule.opens_at).toLocaleDateString("vi-VN")})`;

    const examR = await pool.query<{ id: string }>(
      `INSERT INTO exams (
         title, description, class_id, admin_class_id, subject_id, created_by,
         duration_min, num_versions, closes_at, opens_at, ends_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10)
       RETURNING id`,
      [
        title,
        `${title} — ${QUESTIONS_PER_EXAM} câu trắc nghiệm (thang 10). Lịch: mở ${schedule.opens_at}, đóng ${schedule.ends_at}.`,
        classId,
        adminClassId,
        subject.id,
        teacherId,
        schedule.duration_min,
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

    await insertMcqQuestions(examId, subject.name, 0);
    await ensureVersionPoolForExam(examId);

    created++;
    console.log(
      `   ✓ [${created}/${EXAM_COUNT}] ${title}\n      Mở: ${schedule.opens_at}\n      Đóng: ${schedule.ends_at}`
    );
  }

  console.log(`\n=== Hoàn tất: đã thêm ${created} bài thi ===`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
