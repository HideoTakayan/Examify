/**
 * Xóa toàn bộ phiên thi của một SV và tạo lại ~N bài đã nộp với điểm ngẫu nhiên.
 *
 * Usage (từ BackEnd/server):
 *   npm run reset-student-sessions -- --email=lop10c2doi@gmail.com
 *   npm run reset-student-sessions -- --email=lop10c2doi@gmail.com --count=10
 *   npm run reset-student-sessions -- --email=... --max-semester=3  # demo AI dự đoán
 */
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import pool from "~/config/db";
import type { GradedDetailRow } from "~/services/exam.service";

const DEFAULT_COUNT = 10;
const SCORE_MIN = 4.5;
const SCORE_MAX = 9.5;

const CHAPTER_LABELS = [
  "Kiến thức nền",
  "Khái niệm cốt lõi",
  "Ứng dụng thực tế",
  "Thực hành nâng cao",
  "Tổng hợp",
];

type QuestionRow = {
  id: string;
  question_type: string;
  points: string | number;
  display_order: number;
  chapter: number | null;
  chapter_label: string | null;
};

function parseArgs(): { email: string; count: number; maxSemester: number } {
  let email = "";
  let count = DEFAULT_COUNT;
  let maxSemester = 0;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--email=")) email = arg.slice("--email=".length).trim();
    else if (arg.startsWith("--count=")) {
      count = Math.max(1, Math.min(20, Number(arg.slice("--count=".length)) || DEFAULT_COUNT));
    } else if (arg.startsWith("--max-semester=")) {
      maxSemester = Math.max(0, Number(arg.slice("--max-semester=".length)) || 0);
    }
  }
  if (!email) {
    console.error("Thiếu --email=...");
    process.exit(1);
  }
  return { email, count, maxSemester };
}

function randomScore(): number {
  const raw = SCORE_MIN + Math.random() * (SCORE_MAX - SCORE_MIN);
  return Math.round(raw * 10) / 10;
}

async function deleteStudentSessions(client: PoolClient, studentId: string): Promise<number> {
  await client.query(
    `UPDATE exam_retake_grants g
     SET superseded_session_id = NULL, consumed_session_id = NULL
     WHERE g.student_id = $1
        OR EXISTS (
          SELECT 1 FROM exam_sessions s
          WHERE s.student_id = $1
            AND (g.superseded_session_id = s.id OR g.consumed_session_id = s.id)
        )`,
    [studentId]
  );

  await client.query(
    `UPDATE exam_sessions SET superseded_by = NULL, retake_grant_id = NULL
     WHERE student_id = $1`,
    [studentId]
  );

  await client.query(
    `DELETE FROM exam_integrity_events e
     USING exam_sessions s
     WHERE s.id = e.session_id AND s.student_id = $1`,
    [studentId]
  );

  await client.query(
    `DELETE FROM exam_proctor_logs p
     USING exam_sessions s
     WHERE s.id = p.session_id AND s.student_id = $1`,
    [studentId]
  );

  const deleted = await client.query(
    `DELETE FROM exam_sessions WHERE student_id = $1 RETURNING id`,
    [studentId]
  );
  await client.query(`DELETE FROM exam_retake_grants WHERE student_id = $1`, [studentId]);
  return deleted.rowCount ?? 0;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadExamQuestions(client: PoolClient, examId: string): Promise<QuestionRow[]> {
  const r = await client.query<QuestionRow>(
    `SELECT id, question_type, points, display_order, chapter, chapter_label
     FROM questions
     WHERE exam_id = $1
     ORDER BY display_order, created_at`,
    [examId]
  );
  return r.rows;
}

/** Gán chapter cho câu hỏi demo nếu thiếu — phục vụ nhóm câu sai / chương yếu trên trang AI. */
async function ensureQuestionChapters(
  client: PoolClient,
  questions: QuestionRow[]
): Promise<void> {
  const mcqs = questions
    .filter((q) => q.question_type === "mcq")
    .sort((a, b) => a.display_order - b.display_order);
  if (mcqs.length === 0) return;

  const chapterCount = Math.min(5, Math.max(2, Math.ceil(mcqs.length / 8)));
  const perChapter = Math.max(2, Math.ceil(mcqs.length / chapterCount));

  for (let i = 0; i < mcqs.length; i++) {
    const q = mcqs[i];
    const chapter = Math.min(chapterCount, Math.floor(i / perChapter) + 1);
    const chapterLabel = CHAPTER_LABELS[chapter - 1] ?? `Chương ${chapter}`;
    if (q.chapter === chapter && q.chapter_label === chapterLabel) continue;
    await client.query(
      `UPDATE questions SET chapter = $1, chapter_label = $2 WHERE id = $3`,
      [chapter, chapterLabel, q.id]
    );
    q.chapter = chapter;
    q.chapter_label = chapterLabel;
  }
}

/**
 * Tạo graded_details có câu sai theo chương — buildWrongAnswerBundle đọc từ đây.
 * Gom sai vào 2 chương giữa để UI "Chủ điểm cần ôn" có dữ liệu rõ ràng.
 */
function buildGradedDetails(
  questions: QuestionRow[],
  targetScore: number
): { rows: GradedDetailRow[]; score: number } {
  const sorted = [...questions].sort((a, b) => a.display_order - b.display_order);
  const mcqs = sorted.filter((q) => q.question_type === "mcq");
  const essays = sorted.filter((q) => q.question_type === "essay");

  const mcqMax = mcqs.reduce((s, q) => s + Number(q.points), 0);
  const essayMax = essays.reduce((s, q) => s + Number(q.points), 0);
  const maxPoints = mcqMax + essayMax;
  const clampedTarget = Math.max(0, Math.min(maxPoints, targetScore));

  const essayEarned =
    essays.length > 0 ? Math.round(Math.min(essayMax, Math.max(0, clampedTarget * 0.15)) * 10) / 10 : 0;
  const mcqTarget = Math.max(0, Math.min(mcqMax, clampedTarget - essayEarned));

  const chapters = [...new Set(mcqs.map((q) => q.chapter ?? 1))].sort((a, b) => a - b);
  const weakChapters = new Set(
    chapters.length >= 2 ? chapters.slice(1, 3) : chapters.slice(0, 1)
  );

  const rows: GradedDetailRow[] = [];
  let mcqEarned = 0;
  let wrongBudget = mcqMax - mcqTarget;

  for (const q of mcqs) {
    const pts = Number(q.points);
    const inWeakChapter = weakChapters.has(q.chapter ?? 1);
    let isCorrect = true;

    if (inWeakChapter && wrongBudget >= pts) {
      isCorrect = false;
      wrongBudget -= pts;
    } else if (mcqEarned + pts <= mcqTarget) {
      isCorrect = true;
    } else if (wrongBudget >= pts) {
      isCorrect = false;
      wrongBudget -= pts;
    } else {
      isCorrect = false;
    }

    const pointsEarned = isCorrect ? pts : 0;
    mcqEarned += pointsEarned;
    rows.push({
      question_id: q.id,
      question_type: "mcq",
      submitted: isCorrect ? "A" : "B",
      correct: "A",
      is_correct: isCorrect,
      points_earned: pointsEarned,
      max_points: pts,
      pending_grading: false,
    });
  }

  let essayAssigned = 0;
  for (const q of essays) {
    const pts = Number(q.points);
    const share =
      essays.length === 1
        ? essayEarned
        : Math.round((essayEarned / essays.length) * 10) / 10;
    const pointsEarned = Math.min(pts, share);
    essayAssigned += pointsEarned;
    rows.push({
      question_id: q.id,
      question_type: "essay",
      submitted: "Bài làm demo",
      is_correct: pointsEarned >= pts,
      points_earned: pointsEarned,
      max_points: pts,
      pending_grading: false,
      teacher_comment: null,
    });
  }

  const score = Math.round((mcqEarned + essayAssigned) * 10) / 10;
  return { rows, score };
}

async function main() {
  const { email, count, maxSemester } = parseArgs();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const studentR = await client.query<{
      id: string;
      email: string;
      full_name: string | null;
      admin_class_id: string | null;
    }>(
      `SELECT id, email, full_name, admin_class_id
       FROM accounts
       WHERE (email = $1 OR email ILIKE $2) AND role = 'student'
       LIMIT 1`,
      [email, email.replace(/2(?=doi@)/, "z")]
    );
    const student = studentR.rows[0];
    if (!student) {
      throw new Error(`Không tìm thấy SV email: ${email}`);
    }

    const removed = await deleteStudentSessions(client, student.id);
    console.log(`Đã xóa ${removed} phiên thi cũ của ${student.full_name ?? email}.`);

    type ExamRow = {
      id: string;
      title: string;
      subject_id: string | null;
      subject_name: string | null;
      subject_semester: number | null;
      max_pts: string;
    };

    const semesterFilter =
      maxSemester > 0
        ? `AND (s.semester IS NULL OR s.semester <= ${maxSemester})`
        : "";

    const examR = await client.query<ExamRow>(
      `
      SELECT e.id,
             e.title,
             e.subject_id,
             s.name AS subject_name,
             s.semester AS subject_semester,
             COALESCE(SUM(q.points), 10)::text AS max_pts
      FROM exams e
      LEFT JOIN subjects s ON s.id = e.subject_id
      JOIN questions q ON q.exam_id = e.id
      WHERE q.points IS NOT NULL
        ${semesterFilter}
        AND (
          e.admin_class_id = $1
          OR ($1 IS NULL AND e.admin_class_id IS NULL)
          OR e.admin_class_id IS NULL
        )
      GROUP BY e.id, e.title, s.name, e.subject_id, s.semester, e.created_at
      HAVING COUNT(q.id) > 0
      ORDER BY COALESCE(s.semester, 99), e.created_at DESC
      LIMIT 80
      `,
      [student.admin_class_id]
    );

    const seenSubjects = new Set<string>();
    const exams: typeof examR.rows = [];
    for (const row of examR.rows) {
      const key = normalizeName(row.subject_name ?? row.title);
      if (seenSubjects.has(key)) continue;
      seenSubjects.add(key);
      exams.push(row);
      if (exams.length >= count) break;
    }

    if (exams.length < count) {
      const extraR = await client.query<ExamRow>(
        `
        SELECT e.id, e.title, e.subject_id, s.name AS subject_name,
               s.semester AS subject_semester,
               COALESCE(SUM(q.points), 10)::text AS max_pts
        FROM exams e
        LEFT JOIN subjects s ON s.id = e.subject_id
        JOIN questions q ON q.exam_id = e.id
        WHERE TRUE ${semesterFilter}
        GROUP BY e.id, e.title, s.name, e.subject_id, s.semester, e.created_at
        HAVING COUNT(q.id) > 0
        ORDER BY COALESCE(s.semester, 99), e.created_at DESC
        LIMIT 80
        `
      );
      for (const row of extraR.rows) {
        if (exams.length >= count) break;
        const key = normalizeName(row.subject_name ?? row.title);
        if (seenSubjects.has(key)) continue;
        seenSubjects.add(key);
        exams.push(row);
      }
    }
    if (exams.length === 0) {
      throw new Error("Không có đề thi nào có câu hỏi để gán điểm.");
    }

    console.log(
      `Tạo ${exams.length} phiên mới (điểm ngẫu nhiên ${SCORE_MIN}–${SCORE_MAX}/10` +
        (maxSemester > 0 ? `, chỉ môn ≤ kỳ ${maxSemester}` : "") +
        "):"
    );
    for (let i = 0; i < exams.length; i++) {
      const exam = exams[i];
      const maxPoints = Math.max(1, Number(exam.max_pts) || 10);
      const grade10 = randomScore();
      const targetScore = Math.round((grade10 / 10) * maxPoints * 10) / 10;
      const daysAgo = exams.length - i;
      const started = new Date(Date.now() - daysAgo * 86400000 - 3600000);
      const submitted = new Date(started.getTime() + 50 * 60_000);

      const questions = await loadExamQuestions(client, exam.id);
      await ensureQuestionChapters(client, questions);
      const { rows: gradedDetails, score } = buildGradedDetails(questions, targetScore);

      await client.query(
        `INSERT INTO exam_sessions (
           id, exam_id, student_id, status, started_at, submitted_at,
           score, max_points, graded_details, grading_status
         )
         VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, $8::jsonb, 'complete')`,
        [
          randomUUID(),
          exam.id,
          student.id,
          started.toISOString(),
          submitted.toISOString(),
          score,
          maxPoints,
          JSON.stringify(gradedDetails),
        ]
      );
      const wrongCount = gradedDetails.filter((d) => !d.is_correct && d.question_type === "mcq").length;
      const label = exam.subject_name ?? exam.title;
      const sem = exam.subject_semester != null ? ` (kỳ ${exam.subject_semester})` : "";
      console.log(
        `  ${i + 1}. ${label}${sem}: ${grade10}/10 (raw ${score}/${maxPoints}, ${wrongCount} câu sai TN)`
      );
    }

    await client.query("COMMIT");
    console.log("\nHoàn tất.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
