/**
 * Kiểm tra API chấm điểm trả đủ options MCQ (4 đáp án) cho phiên đã nộp.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/verify-grading-mcq-options.ts
 */
import "dotenv/config";
import pool from "~/config/db";

const EXAM_ID = process.env.EXAM_ID ?? "c4907d43-fe54-4597-882f-86374cab051b";
const API_BASE = (process.env.API_BASE ?? "http://localhost:5000/v1").replace(/\/$/, "");
const TEACHER_EMAIL = process.env.TEACHER_EMAIL ?? "admin01@system.local";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD ?? "Test@123";

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD,
      device_id: "verify-grading-mcq",
      device_info: "script",
    }),
  });
  const json = (await res.json()) as { success?: boolean; data?: { token: string }; message?: string };
  if (!res.ok) throw new Error(json.message ?? `login ${res.status}`);
  return json.data!.token;
}

async function main() {
  const sessionRow = await pool.query<{ id: string }>(
    `SELECT es.id FROM exam_sessions es
     WHERE es.exam_id = $1 AND es.status = 'submitted' AND es.voided_at IS NULL
     ORDER BY es.submitted_at DESC NULLS LAST
     LIMIT 1`,
    [EXAM_ID]
  );
  const sessionId = sessionRow.rows[0]?.id;
  if (!sessionId) {
    console.error("Không có phiên submitted — chạy load test trước.");
    process.exit(1);
  }

  const token = await login();
  const res = await fetch(`${API_BASE}/exams/sessions/${sessionId}/grading`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: {
      questions: Array<{ id: string; question_type: string; options: Record<string, string> | null }>;
      graded_details: Array<{ question_id: string; question_type: string }>;
    };
    message?: string;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? `grading ${res.status}`);
  }

  const mcqIds = new Set(
    json.data.graded_details.filter((d) => d.question_type === "mcq").map((d) => d.question_id)
  );
  const mcqQuestions = json.data.questions.filter(
    (q) => q.question_type === "mcq" && mcqIds.has(q.id)
  );

  let ok = 0;
  let fail = 0;
  for (const q of mcqQuestions) {
    const n = q.options ? Object.keys(q.options).length : 0;
    if (n >= 4) {
      ok += 1;
      console.log(`OK  ${q.id.slice(0, 8)}… options=${n}`);
    } else {
      fail += 1;
      console.log(`FAIL ${q.id.slice(0, 8)}… options=${n}`);
    }
  }

  console.log(`\nMCQ trong bài chấm: ${mcqQuestions.length}, đủ ≥4 đáp án: ${ok}, thiếu: ${fail}`);
  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  void pool.end();
  process.exit(1);
});
