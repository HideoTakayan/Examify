/**
 * Load test: 30 SV làm bài "Tiếng Anh P4", 4 SV giả lập mất mạng (>35s không autosave),
 * 1 SV vi phạm ≥3 lần, sau đó GV cấp thi lại cho 4 SV disconnect và làm lại.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/loadtest-eng4-30-disconnect.ts
 *   npx ts-node ... -- --api=http://localhost:5000/v1 --skip-retake
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import pool from "~/config/db";

const EXAM_ID = process.env.EXAM_ID ?? "c4907d43-fe54-4597-882f-86374cab051b";
const API_BASE = (() => {
  const arg = process.argv.find((a) => a.startsWith("--api="));
  if (arg) return arg.replace("--api=", "").replace(/\/$/, "");
  return (process.env.API_BASE ?? "http://localhost:5000/v1").replace(/\/$/, "");
})();
const SKIP_RETAKE = process.argv.includes("--skip-retake");
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD ?? "Test@123";
const TEACHER_EMAIL = process.env.TEACHER_EMAIL ?? "admin01@system.local";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD ?? "Test@123";
const TOTAL_STUDENTS = 30;
const DISCONNECT_COUNT = 4;
const VIOLATION_STUDENT_INDEX = 4;
const DISCONNECT_SILENCE_MS = 35_000;
const NORMAL_AUTOSAVE_ROUNDS = 3;
const AUTOSAVE_INTERVAL_MS = 8_000;

type StudentRow = { id: string; email: string; username: string };
type FlowMode = "normal" | "disconnect" | "violation";

async function api<T>(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: { success?: boolean; message?: string; data?: T };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${json.message ?? text.slice(0, 200)}`);
  }
  return json.data as T;
}

async function login(email: string, password: string): Promise<string> {
  const data = await api<{ token: string }>("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
      device_id: `loadtest-${email}`,
      device_info: "loadtest-eng4-30",
    },
  });
  return data.token;
}

function sampleAnswers(n = 8): Record<string, string> {
  const keys = ["A", "B", "C", "D"];
  const out: Record<string, string> = {};
  for (let i = 1; i <= n; i += 1) {
    out[`q${i}`] = keys[i % 4];
  }
  return out;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function reportViolations(sessionId: string, token: string, count = 3) {
  for (let i = 0; i < count; i += 1) {
    await api(`/exams/sessions/${sessionId}/report-violation`, {
      method: "POST",
      token,
      body: {
        violation_type: "visibility_hidden",
        reason: `loadtest strike ${i + 1}`,
        client_at: new Date().toISOString(),
      },
    });
    await sleep(300);
  }
}

async function studentFlow(
  student: StudentRow,
  token: string,
  mode: FlowMode
): Promise<{ email: string; mode: string; sessionId?: string; studentId: string; error?: string }> {
  const tag = mode === "disconnect" ? "[DC]" : mode === "violation" ? "[VP]" : "[OK]";
  try {
    const start = await api<{
      session: { id: string };
    }>(`/exams/${EXAM_ID}/sessions`, { method: "POST", token });

    const sessionId = start.session.id;
    const answers = sampleAnswers(12);

    await api("/exams/autosave", {
      method: "POST",
      token,
      body: {
        exam_id: EXAM_ID,
        saved_at: new Date().toISOString(),
        answers,
      },
    });
    console.log(`${tag} ${student.email} start=${sessionId.slice(0, 8)} autosave#1`);

    if (mode === "violation") {
      await reportViolations(sessionId, token, 3);
      console.log(`${tag} ${student.email} reported 3 violations`);
      return { email: student.email, mode, sessionId, studentId: student.id };
    }

    if (mode === "disconnect") {
      console.log(`${tag} ${student.email} im lặng ${DISCONNECT_SILENCE_MS}ms (giả lập mất mạng)`);
      await sleep(DISCONNECT_SILENCE_MS);
      return { email: student.email, mode, sessionId, studentId: student.id };
    }

    for (let r = 0; r < NORMAL_AUTOSAVE_ROUNDS; r += 1) {
      await sleep(AUTOSAVE_INTERVAL_MS);
      answers[`q${r + 2}`] = "B";
      await api("/exams/autosave", {
        method: "POST",
        token,
        body: {
          exam_id: EXAM_ID,
          saved_at: new Date().toISOString(),
          answers,
        },
      });
      console.log(`${tag} ${student.email} autosave#${r + 2}`);
    }

    const submitPayload: Record<string, string> = {};
    for (let i = 0; i < 8; i += 1) submitPayload[String(i)] = "B";

    await api(`/exams/sessions/${sessionId}/submit`, {
      method: "POST",
      token,
      body: { answers: submitPayload },
    });
    console.log(`${tag} ${student.email} submitted`);
    return { email: student.email, mode, sessionId, studentId: student.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${tag} ${student.email} ERROR: ${msg}`);
    return { email: student.email, mode, studentId: student.id, error: msg };
  }
}

async function retakeFlow(
  student: StudentRow,
  token: string
): Promise<{ email: string; ok: boolean; error?: string }> {
  try {
    const start = await api<{ session: { id: string } }>(`/exams/${EXAM_ID}/sessions`, {
      method: "POST",
      token,
    });
    const sessionId = start.session.id;
    const answers = sampleAnswers(12);
    for (let i = 0; i < 2; i += 1) {
      await sleep(2000);
      answers[`q${i + 1}`] = "C";
      await api("/exams/autosave", {
        method: "POST",
        token,
        body: { exam_id: EXAM_ID, saved_at: new Date().toISOString(), answers },
      });
    }
    const submitPayload: Record<string, string> = {};
    for (let i = 0; i < 8; i += 1) submitPayload[String(i)] = "C";
    await api(`/exams/sessions/${sessionId}/submit`, {
      method: "POST",
      token,
      body: { answers: submitPayload },
    });
    console.log(`[RETAKE] ${student.email} submitted new session`);
    return { email: student.email, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[RETAKE] ${student.email} ERROR: ${msg}`);
    return { email: student.email, ok: false, error: msg };
  }
}

async function reportDb() {
  const rows = await pool.query<{
    email: string;
    status: string;
    submit_source: string | null;
    disconnect_flag: boolean;
    score: number | null;
    voided_at: string | null;
    tags_note: string;
  }>(
    `SELECT a.email, es.status, es.submit_source, es.disconnect_flag, es.score, es.voided_at,
            CASE
              WHEN es.voided_at IS NOT NULL THEN 'voided'
              WHEN es.disconnect_flag THEN 'disconnected'
              WHEN (SELECT COUNT(*) FROM exam_integrity_events e
                    WHERE e.session_id = es.id AND e.event_type IN (
                      'fullscreen_exit','visibility_hidden','window_blur','tab_switch',
                      'devtools_open','copy_attempt','paste_attempt','context_menu','before_unload','other'
                    )) >= 3 THEN 'violations'
              ELSE COALESCE(es.submit_source, '-')
            END AS tags_note
     FROM exam_sessions es
     JOIN accounts a ON a.id = es.student_id
     WHERE es.exam_id = $1
     ORDER BY a.email, es.created_at`,
    [EXAM_ID]
  );

  console.log("\n========== DB SAU TEST ==========");
  const active = rows.rows.filter((r) => !r.voided_at && r.status === "active").length;
  const submitted = rows.rows.filter((r) => !r.voided_at && r.status === "submitted").length;
  const dc = rows.rows.filter((r) => !r.voided_at && r.disconnect_flag).length;
  const voided = rows.rows.filter((r) => r.voided_at).length;
  console.log(`Phiên active=${active} submitted=${submitted} disconnect_flag=${dc} voided=${voided}`);
  for (const r of rows.rows) {
    console.log(
      `  ${r.status.padEnd(10)} ${r.email} src=${r.submit_source ?? "-"} dc=${r.disconnect_flag} score=${r.score ?? "-"} note=${r.tags_note} void=${r.voided_at ? "Y" : "N"}`
    );
  }
}

async function main() {
  console.log("API:", API_BASE);
  console.log("EXAM:", EXAM_ID);

  const studentsR = await pool.query<StudentRow>(
    `SELECT id, email, username FROM accounts
     WHERE role = 'student' AND admin_class_id = (SELECT admin_class_id FROM exams WHERE id = $1)
     ORDER BY email LIMIT $2`,
    [EXAM_ID, TOTAL_STUDENTS]
  );
  const studentCount = studentsR.rowCount ?? 0;
  if (studentCount < TOTAL_STUDENTS) {
    throw new Error(`Chỉ có ${studentCount} SV trong lớp đề, cần ${TOTAL_STUDENTS}`);
  }
  const students = studentsR.rows;

  const hash = await bcrypt.hash(STUDENT_PASSWORD, 12);
  await pool.query(
    `UPDATE accounts SET first_login = false, hashed_password = $1, password_plain = $2
     WHERE role = 'student' AND admin_class_id = (SELECT admin_class_id FROM exams WHERE id = $3)`,
    [hash, STUDENT_PASSWORD, EXAM_ID]
  );

  const disconnectEmails = new Set(students.slice(0, DISCONNECT_COUNT).map((s) => s.email));
  const violationEmail = students[VIOLATION_STUDENT_INDEX]?.email;
  console.log(`SV: ${students.length}`);
  console.log(`disconnect: ${[...disconnectEmails].join(", ")}`);
  console.log(`violation: ${violationEmail}\n`);

  let teacherToken: string;
  try {
    teacherToken = await login(TEACHER_EMAIL, TEACHER_PASSWORD);
  } catch {
    const creator = await pool.query<{ email: string; password_plain: string | null }>(
      `SELECT a.email, a.password_plain FROM exams e JOIN accounts a ON a.id = e.created_by WHERE e.id = $1`,
      [EXAM_ID]
    );
    const c = creator.rows[0];
    if (!c?.email) throw new Error("Không login được GV và không có creator");
    teacherToken = await login(c.email, c.password_plain ?? TEACHER_PASSWORD);
    console.log("Teacher fallback:", c.email);
  }

  await api(`/exams/${EXAM_ID}/start-runtime`, { method: "POST", token: teacherToken });
  console.log("Đã mở phiên thi (start-runtime)\n");
  await sleep(1500);

  const tokens: { student: StudentRow; token: string }[] = [];
  for (const s of students) {
    tokens.push({ student: s, token: await login(s.email, STUDENT_PASSWORD) });
  }
  console.log(`Đã login ${tokens.length} SV\n`);

  const resolveMode = (email: string, idx: number): FlowMode => {
    if (disconnectEmails.has(email)) return "disconnect";
    if (email === violationEmail) return "violation";
    return "normal";
  };

  const results = await Promise.all(
    tokens.map(({ student, token }, idx) =>
      studentFlow(student, token, resolveMode(student.email, idx))
    )
  );

  console.log("\nChờ 2s rồi GV ép nộp cả lớp...");
  await sleep(2000);
  const force = await api<{
    active_sessions: number;
    submitted_sessions: number;
    failed_sessions: number;
  }>(`/exams/${EXAM_ID}/force-submit`, { method: "POST", token: teacherToken });
  console.log("force-submit:", force);

  await sleep(1000);
  await reportDb();

  if (!SKIP_RETAKE) {
    console.log("\n========== CẤP THI LẠI (disconnect) ==========");
    const dcResults = results.filter((r) => r.mode === "disconnect" && r.studentId && !r.error);
    for (const r of dcResults) {
      await api(`/exams/${EXAM_ID}/retake-grants`, {
        method: "POST",
        token: teacherToken,
        body: {
          student_id: r.studentId,
          reason: "Load test: mất kết nối > 30s",
        },
      });
      console.log(`Granted retake: ${r.email}`);
    }

    await api(`/exams/${EXAM_ID}/start-runtime`, { method: "POST", token: teacherToken });
    console.log("Mở lại phiên thi cho vòng thi lại\n");
    await sleep(1500);

    const retakeTokens = tokens.filter(({ student }) => disconnectEmails.has(student.email));
    const retakeResults = await Promise.all(
      retakeTokens.map(({ student, token }) => retakeFlow(student, token))
    );
    console.log(
      "Retake OK:",
      retakeResults.filter((x) => x.ok).length,
      "/",
      retakeResults.length
    );
    await sleep(500);
    await reportDb();
  }

  console.log("\n========== TÓM TẮT ==========");
  console.log("Normal OK:", results.filter((r) => r.mode === "normal" && !r.error).length);
  console.log("Disconnect:", results.filter((r) => r.mode === "disconnect" && !r.error).length);
  console.log("Violation:", results.filter((r) => r.mode === "violation" && !r.error).length);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  void pool.end();
  process.exit(1);
});
