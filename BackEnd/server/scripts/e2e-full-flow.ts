/**
 * E2E full flow — một lần chạy qua Admin → Teacher → Student (REST API).
 *
 * Yêu cầu: Backend đang chạy (`npm run dev`), DB đã migrate.
 *
 * Chạy:
 *   cd BackEnd/server
 *   npm run e2e:full
 *
 * Biến môi trường (tùy chọn):
 *   E2E_API_BASE=http://localhost:5000/v1
 *   E2E_ADMIN_EMAIL=admin01@system.local
 *   E2E_ADMIN_PASSWORD=Test@123
 *   E2E_USE_EXISTING=1     — dùng gv01 + DEMO CLASS thay vì tạo user/lớp mới
 *   E2E_CLEANUP=1          — xóa dữ liệu test vừa tạo (chỉ khi không dùng USE_EXISTING)
 *   E2E_SKIP_AI=1          — bỏ bước grade-predictor (mặc định bỏ nếu không có MINIMAX)
 */

import pool from "../src/config/db";

const API_BASE = (process.env.E2E_API_BASE ?? "http://localhost:5000/v1").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin01@system.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Test@123";
const USE_EXISTING =
  process.env.E2E_USE_EXISTING === "1" || process.argv.includes("--use-existing");
const CLEANUP = process.env.E2E_CLEANUP === "1";
const SKIP_AI = process.env.E2E_SKIP_AI !== "0"; // mặc định skip AI

const RUN_ID = Date.now().toString(36);
const TEST_PASSWORD = "Test@123";

type Json = Record<string, unknown>;

interface StepResult {
  phase: string;
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
}

interface Tokens {
  admin: string;
  teacher: string;
  student: string;
}

interface RunContext {
  runId: string;
  programId?: string;
  adminClassId?: string;
  subjectId?: string;
  teacherId?: string;
  studentId?: string;
  teacherEmail?: string;
  studentEmail?: string;
  examId?: string;
  sessionId?: string;
  mcqQuestionIds: string[];
  /** Nội dung đáp án đúng (theo options gốc) — dùng map sang key A–D sau shuffle */
  mcqCorrectTexts: string[];
  essayQuestionId?: string;
  sessionQuestions?: Array<{
    id: string;
    question_type: string;
    options: Record<string, string> | null;
  }>;
  createdUserIds: string[];
  createdExamIds: string[];
  createdClassIds: string[];
  createdProgramIds: string[];
}

const ctx: RunContext = {
  runId: RUN_ID,
  mcqQuestionIds: [],
  mcqCorrectTexts: ["4", "Hà Nội"],
  createdUserIds: [],
  createdExamIds: [],
  createdClassIds: [],
  createdProgramIds: [],
};

const results: StepResult[] = [];

function log(msg: string): void {
  console.log(msg);
}

async function api<T = Json>(
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown; expectStatus?: number }
): Promise<{ status: number; json: T & { success?: boolean; message?: string; error?: string } }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let json: T & { success?: boolean; message?: string; error?: string } = {} as T & {
    success?: boolean;
    message?: string;
    error?: string;
  };
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      json = { message: text } as typeof json;
    }
  }

  const expect = opts?.expectStatus;
  if (expect !== undefined && res.status !== expect) {
    throw new Error(
      `${method} ${path} → HTTP ${res.status} (expected ${expect}): ${json.message ?? json.error ?? text.slice(0, 200)}`
    );
  }

  return { status: res.status, json };
}

async function runStep(
  phase: string,
  name: string,
  fn: () => Promise<void>,
  opts?: { allowFail?: boolean }
): Promise<void> {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ phase, name, ok: true, ms: Date.now() - t0 });
    log(`  ✓ ${name}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    results.push({ phase, name, ok: false, ms: Date.now() - t0, detail });
    log(`  ✗ ${name}: ${detail}`);
    if (!opts?.allowFail) throw e;
  }
}

/** Tài khoản mới có first_login=true — middleware chặn API cho đến khi đổi MK. */
async function clearFirstLogin(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await pool.query(
    `UPDATE accounts SET first_login = false, updated_at = NOW() WHERE id = ANY($1::uuid[])`,
    [userIds]
  );
}

function buildMcqAnswersFromSession(ctx: RunContext): Record<string, string> {
  const answers: Record<string, string> = {};
  const questions = ctx.sessionQuestions ?? [];
  ctx.mcqQuestionIds.forEach((qid, i) => {
    const q = questions.find((x) => x.id === qid);
    const want = ctx.mcqCorrectTexts[i];
    if (!q?.options || !want) {
      answers[qid] = "A";
      return;
    }
    const entry = Object.entries(q.options).find(([, v]) => v === want);
    answers[qid] = entry?.[0] ?? "A";
  });
  if (ctx.essayQuestionId) {
    answers[ctx.essayQuestionId] = "MVC tách Model View Controller.";
  }
  return answers;
}

async function login(email: string, password: string): Promise<string> {
  const { json } = await api<{ data?: { token?: string } }>("POST", "/auth/login", {
    body: { email, password, device_id: `e2e-${RUN_ID}` },
    expectStatus: 200,
  });
  const token = json.data?.token;
  if (!token) throw new Error(`Login failed for ${email}: no token`);
  return token;
}

function dataField<T>(json: { data?: T }, label: string): T {
  if (json.data === undefined || json.data === null) {
    throw new Error(`Missing data: ${label}`);
  }
  return json.data;
}

async function phase0_health(): Promise<void> {
  await runStep("0", "Health GET /", async () => {
    const root = API_BASE.replace(/\/v1$/, "");
    const res = await fetch(`${root}/`);
    if (!res.ok) throw new Error(`Root health HTTP ${res.status}`);
  });
}

async function phase1_admin_setup(tokens: Tokens): Promise<void> {
  await runStep("1-Admin", "Dashboard admin", async () => {
    const { json } = await api("GET", "/dashboard", { token: tokens.admin, expectStatus: 200 });
    if (!json.success) throw new Error("dashboard not success");
  });

  if (USE_EXISTING) {
    await runStep("1-Admin", "Dùng lớp DEMO CLASS + gv01 (USE_EXISTING)", async () => {
      const { json } = await api<{ data?: Array<{ id: string; display_name?: string }> }>(
        "GET",
        "/admin-classes",
        { token: tokens.admin, expectStatus: 200 }
      );
      const classes = Array.isArray(json.data) ? json.data : [];
      const cntt = classes.find((c) => c.display_name?.includes("DEMO CLASS")) ?? classes[0];
      if (!cntt?.id) throw new Error("Không có admin_class — chạy npm run assign-teacher-class");
      ctx.adminClassId = cntt.id;

      const users = await api<{ data?: { items?: Array<{ id: string; email: string; role: string }> } }>(
        "GET",
        "/users?limit=50&role=teacher",
        { token: tokens.admin, expectStatus: 200 }
      );
      const teachers = users.json.data?.items ?? [];
      const gv = teachers.find((t) => t.email === "gv01@system.local") ?? teachers[0];
      if (!gv) throw new Error("Không có teacher — seed DB trước");
      ctx.teacherId = gv.id;
      ctx.teacherEmail = gv.email;
      const teacherPwd = process.env.E2E_TEACHER_PASSWORD ?? TEST_PASSWORD;
      tokens.teacher = await login(gv.email, teacherPwd);

      const svUsers = await api<{ data?: { items?: Array<{ id: string; email: string }> } }>(
        "GET",
        `/users?limit=5&role=student&admin_class_id=${ctx.adminClassId}`,
        { token: tokens.admin, expectStatus: 200 }
      );
      const sv = svUsers.json.data?.items?.[0];
      if (!sv) throw new Error("Không có SV trong lớp — seed-students");
      ctx.studentId = sv.id;
      ctx.studentEmail = sv.email;
      const studentPwd = process.env.E2E_STUDENT_PASSWORD ?? TEST_PASSWORD;
      tokens.student = await login(sv.email, studentPwd);
    });
  } else {
    await runStep("1-Admin", "Tạo / lấy chương trình đào tạo", async () => {
      const { json } = await api<{ data?: Array<{ id: string; code?: string }> }>(
        "GET",
        "/programs",
        { token: tokens.admin, expectStatus: 200 }
      );
      const programs = Array.isArray(json.data) ? json.data : [];
      const existing =
        programs.find((p) => p.code === "CNTT" || p.code === "cntt") ?? programs[0];
      if (existing?.id) {
        ctx.programId = existing.id;
        return;
      }
      const created = await api<{ data?: { id: string } }>("POST", "/programs", {
        token: tokens.admin,
        body: { code: `E2E${RUN_ID}`, name: `E2E Program ${RUN_ID}`, description: "Auto E2E" },
        expectStatus: 201,
      });
      ctx.programId = dataField(created.json, "program").id;
      ctx.createdProgramIds.push(ctx.programId);
    });

    await runStep("1-Admin", "Tạo môn học test", async () => {
      const list = await api<{ data?: { items?: Array<{ id: string }> } }>(
        "GET",
        `/subjects?limit=1&program_id=${ctx.programId}`,
        { token: tokens.admin, expectStatus: 200 }
      );
      const item = list.json.data?.items?.[0];
      if (item?.id) {
        ctx.subjectId = item.id;
        return;
      }
      const created = await api<{ data?: { id: string } }>("POST", "/subjects", {
        token: tokens.admin,
        body: {
          name: `E2E Subject ${RUN_ID}`,
          code: `E2E${RUN_ID}`.slice(0, 12),
          credits: 3,
          program_id: ctx.programId,
          category: "foundation",
        },
        expectStatus: 201,
      });
      ctx.subjectId = dataField(created.json, "subject").id;
    });

    await runStep("1-Admin", "Tạo giáo viên", async () => {
      ctx.teacherEmail = `e2e.gv.${RUN_ID}@system.local`;
      const created = await api<{ data?: { id: string } }>("POST", "/users", {
        token: tokens.admin,
        body: {
          email: ctx.teacherEmail,
          username: `e2e_gv_${RUN_ID}`,
          password: TEST_PASSWORD,
          role: "teacher",
          full_name: `E2E Teacher ${RUN_ID}`,
        },
        expectStatus: 201,
      });
      ctx.teacherId = dataField(created.json, "teacher").id;
      ctx.createdUserIds.push(ctx.teacherId);
    });

    await runStep("1-Admin", "Tạo lớp hành chính + gán GV", async () => {
      const displayName = `E2E-${RUN_ID}`;
      const section = RUN_ID.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "e2e";
      const intakeYear = 2090 + (parseInt(RUN_ID.slice(-2), 36) % 9);
      try {
        const created = await api<{ data?: { id: string } }>("POST", "/admin-classes", {
          token: tokens.admin,
          body: {
            program_id: ctx.programId,
            intake_year: intakeYear,
            section,
            display_name: displayName,
            manager_teacher_id: ctx.teacherId,
          },
          expectStatus: 201,
        });
        ctx.adminClassId = dataField(created.json, "adminClass").id;
      } catch {
        const listed = await api<{ data?: Array<{ id: string; display_name?: string }> }>(
          "GET",
          "/admin-classes",
          { token: tokens.admin, expectStatus: 200 }
        );
        const found = (listed.json.data ?? []).find((c) => c.display_name === displayName);
        if (!found?.id) throw new Error("Không tạo được lớp HC và không tìm thấy lớp E2E");
        ctx.adminClassId = found.id;
      }
      ctx.createdClassIds.push(ctx.adminClassId!);
    });

    await runStep("1-Admin", "Tạo sinh viên + gán lớp", async () => {
      ctx.studentEmail = `e2e.sv.${RUN_ID}@system.local`;
      const created = await api<{ data?: { id: string } }>("POST", "/users", {
        token: tokens.admin,
        body: {
          email: ctx.studentEmail,
          username: `e2e_sv_${RUN_ID}`,
          password: TEST_PASSWORD,
          role: "student",
          full_name: `E2E Student ${RUN_ID}`,
          admin_class_id: ctx.adminClassId,
        },
        expectStatus: 201,
      });
      ctx.studentId = dataField(created.json, "student").id;
      ctx.createdUserIds.push(ctx.studentId);
      await clearFirstLogin([ctx.teacherId!, ctx.studentId!]);
      tokens.teacher = await login(ctx.teacherEmail!, TEST_PASSWORD);
      tokens.student = await login(ctx.studentEmail!, TEST_PASSWORD);
    });
  }

  if (!ctx.subjectId) {
    await runStep("1-Admin", "Lấy subject_id", async () => {
      const { json } = await api<{ data?: { items?: Array<{ id: string }> } }>(
        "GET",
        `/subjects?limit=1${ctx.programId ? `&program_id=${ctx.programId}` : ""}`,
        { token: tokens.admin, expectStatus: 200 }
      );
      const id = json.data?.items?.[0]?.id;
      if (!id) throw new Error("Không có môn học trong DB");
      ctx.subjectId = id;
    });
  }

  await runStep("1-Admin", "GET /users (danh sách)", async () => {
    await api("GET", "/users?limit=5", { token: tokens.admin, expectStatus: 200 });
  });

  await runStep("1-Admin", "Audit logs", async () => {
    await api("GET", "/audit-logs?limit=5", { token: tokens.admin, expectStatus: 200 });
  });

  await runStep("1-Admin", "System report", async () => {
    await api("GET", "/system-report", { token: tokens.admin, expectStatus: 200 });
  });
}

async function phase2_teacher_exam(tokens: Tokens): Promise<void> {
  await runStep("2-Teacher", "Dashboard giáo viên", async () => {
    await api("GET", "/dashboard", { token: tokens.teacher, expectStatus: 200 });
  });

  await runStep("2-Teacher", "admin-classes/me", async () => {
    const { json } = await api<{ data?: unknown }>("GET", "/admin-classes/me", {
      token: tokens.teacher,
      expectStatus: 200,
    });
    if (!json.data) throw new Error("GV chưa được gán lớp");
  });

  await runStep("2-Teacher", "Tạo đề thi", async () => {
    const { json } = await api<{ data?: { id: string } }>("POST", "/exams", {
      token: tokens.teacher,
      body: {
        title: `E2E Exam ${RUN_ID}`,
        admin_class_id: ctx.adminClassId,
        subject_id: ctx.subjectId,
        duration_min: 30,
        description: "Full flow automated test",
        num_versions: 1,
      },
      expectStatus: 201,
    });
    ctx.examId = dataField(json, "exam").id;
    ctx.createdExamIds.push(ctx.examId);
  });

  await runStep("2-Teacher", "Thêm câu MCQ + tự luận", async () => {
    const examId = ctx.examId!;
    const chapterMeta = { chapter: 1, chapter_label: "Chương 1" };
    const mcq1 = await api<{ data?: { id: string } }>("POST", `/exams/${examId}/questions`, {
      token: tokens.teacher,
      body: {
        content: "E2E: 2 + 2 = ?",
        points: 2,
        question_type: "mcq",
        options: { A: "3", B: "4", C: "5", D: "6" },
        correct_answer: "B",
        version_index: 0,
        ...chapterMeta,
      },
      expectStatus: 201,
    });
    const mcq2 = await api<{ data?: { id: string } }>("POST", `/exams/${examId}/questions`, {
      token: tokens.teacher,
      body: {
        content: "E2E: Thủ đô Việt Nam?",
        points: 2,
        question_type: "mcq",
        options: { A: "Hà Nội", B: "TP.HCM", C: "Đà Nẵng", D: "Huế" },
        correct_answer: "A",
        version_index: 0,
        ...chapterMeta,
      },
      expectStatus: 201,
    });
    const essay = await api<{ data?: { id: string } }>("POST", `/exams/${examId}/questions`, {
      token: tokens.teacher,
      body: {
        content: "E2E: Giải thích MVC (ngắn).",
        points: 4,
        question_type: "essay",
        version_index: 0,
        ...chapterMeta,
      },
      expectStatus: 201,
    });
    ctx.mcqQuestionIds = [mcq1.json.data!.id, mcq2.json.data!.id];
    ctx.essayQuestionId = essay.json.data!.id;
  });

  await runStep("2-Teacher", "Ngân hàng câu hỏi — list", async () => {
    await api("GET", "/question-bank?limit=3", { token: tokens.teacher, expectStatus: 200 });
  });

  await runStep("2-Teacher", "Start runtime", async () => {
    await api("POST", `/exams/${ctx.examId}/start-runtime`, {
      token: tokens.teacher,
      expectStatus: 200,
    });
  });

  await runStep("2-Teacher", "Proctoring overview", async () => {
    await api("GET", `/exams/${ctx.examId}/proctoring`, {
      token: tokens.teacher,
      expectStatus: 200,
    });
  });
}

async function phase3_student_exam(tokens: Tokens): Promise<void> {
  await runStep("3-Student", "Dashboard sinh viên", async () => {
    await api("GET", "/dashboard", { token: tokens.student, expectStatus: 200 });
  });

  await runStep("3-Student", "Xem chi tiết đề (quyền SV)", async () => {
    await api("GET", `/exams/${ctx.examId}`, {
      token: tokens.student,
      expectStatus: 200,
    });
  });

  await runStep("3-Student", "Danh sách đề thi (lớp HC)", async () => {
    const { json } = await api<{
      data?: { items?: Array<{ id: string }> };
    }>("GET", `/exams?limit=50&admin_class_id=${ctx.adminClassId}`, {
      token: tokens.student,
      expectStatus: 200,
    });
    const list = json.data?.items ?? [];
    if (!list.some((e) => e.id === ctx.examId)) {
      throw new Error("SV không thấy đề trong lớp — kiểm tra admin_class_id");
    }
  });

  await runStep("3-Student", "Bắt đầu phiên thi", async () => {
    const { json } = await api<{
      data?: { session?: { id: string }; questions?: Array<{ id: string }> };
    }>("POST", `/exams/${ctx.examId}/sessions`, {
      token: tokens.student,
      expectStatus: 201,
    });
    const data = dataField(json, "sessionPayload");
    ctx.sessionId = data.session?.id;
    if (!ctx.sessionId) throw new Error("Không có session id");
    ctx.sessionQuestions = (data.questions ?? []) as RunContext["sessionQuestions"];
  });

  await runStep("3-Student", "Autosave", async () => {
    const answers = buildMcqAnswersFromSession(ctx);
    await api("POST", "/exams/autosave", {
      token: tokens.student,
      body: {
        exam_id: ctx.examId,
        saved_at: new Date().toISOString(),
        answers,
      },
      expectStatus: 200,
    });
  });

  await runStep("3-Student", "Integrity events", async () => {
    await api("POST", "/exams/integrity-events", {
      token: tokens.student,
      body: {
        exam_id: ctx.examId,
        events: [{ type: "exam_opened", at: new Date().toISOString() }],
      },
      expectStatus: 200,
    });
  });

  await runStep("3-Student", "Nộp bài", async () => {
    const answers = buildMcqAnswersFromSession(ctx);
    const { json } = await api<{ data?: { score?: number; grading_status?: string } }>(
      "POST",
      `/exams/sessions/${ctx.sessionId}/submit`,
      { token: tokens.student, body: { answers }, expectStatus: 200 }
    );
    const score = json.data?.score;
    if (score === undefined) throw new Error("Submit không trả score");
    if (Number(score) < 3) {
      throw new Error(`MCQ score thấp bất thường: ${score} (kỳ vọng >= 3 từ 2 câu MCQ đúng)`);
    }
  });

  await runStep("3-Student", "sessions/me + my-submission", async () => {
    await api("GET", "/exams/sessions/me", { token: tokens.student, expectStatus: 200 });
    await api("GET", `/exams/${ctx.examId}/my-submission`, {
      token: tokens.student,
      expectStatus: 200,
    });
  });

  await runStep("3-Student", "Xem lại bài (review)", async () => {
    await api("GET", `/exams/sessions/${ctx.sessionId}/review`, {
      token: tokens.student,
      expectStatus: 200,
    });
  });
}

async function phase4_teacher_grade(tokens: Tokens): Promise<void> {
  await runStep("4-Teacher", "Danh sách phiên thi", async () => {
    await api("GET", `/exams/${ctx.examId}/sessions?limit=10`, {
      token: tokens.teacher,
      expectStatus: 200,
    });
  });

  await runStep("4-Teacher", "Chấm tự luận", async () => {
    if (!ctx.essayQuestionId) return;
    const grading = await api<{ data?: { questions?: Array<{ id: string; points?: number }> } }>(
      "GET",
      `/exams/sessions/${ctx.sessionId}/grading`,
      { token: tokens.teacher, expectStatus: 200 }
    );
    const essayQ = grading.json.data?.questions?.find((q) => q.id === ctx.essayQuestionId);
    const maxPts = Number(essayQ?.points ?? 4);
    await api("PATCH", `/exams/sessions/${ctx.sessionId}/grade`, {
      token: tokens.teacher,
      body: {
        grades: {
          [ctx.essayQuestionId]: { points_awarded: maxPts, comment: "E2E auto grade" },
        },
      },
      expectStatus: 200,
    });
  });

  await runStep("4-Teacher", "Score analytics", async () => {
    await api("GET", `/score-analytics/exam/${ctx.examId}`, {
      token: tokens.teacher,
      expectStatus: 200,
    });
  });

  await runStep("4-Teacher", "teacher-students list", async () => {
    await api("GET", "/teacher-students/?limit=5", { token: tokens.teacher, expectStatus: 200 });
  });
}

async function phase5_password_reset(tokens: Tokens): Promise<void> {
  if (USE_EXISTING) {
    log("  ⊘ Bỏ qua password-reset (USE_EXISTING)");
    return;
  }

  await runStep("5-Auth", "SV yêu cầu reset mật khẩu", async () => {
    await api("POST", "/password-reset/self", {
      body: { email: ctx.studentEmail },
      expectStatus: 200,
    });
  });

  await runStep("5-Admin", "Duyệt reset mật khẩu", async () => {
    const pending = await api<{ data?: Array<{ id: string }> }>(
      "GET",
      "/password-reset/pending",
      { token: tokens.admin, expectStatus: 200 }
    );
    const paginated = pending.json.data as { items?: Array<{ id: string }> } | undefined;
    const list = paginated?.items ?? (Array.isArray(pending.json.data) ? pending.json.data : []);
    const req = list.find((r) => r.id);
    if (!req?.id) throw new Error("Không có pending reset request");
    await api("POST", "/password-reset/approve", {
      token: tokens.admin,
      body: { request_id: req.id, admin_note: "E2E approve" },
      expectStatus: 200,
    });
  });
}

async function phase6_negative(tokens: Tokens): Promise<void> {
  await runStep("6-Negative", "SV không tạo user (403)", async () => {
    const { status } = await api("POST", "/users", {
      token: tokens.student,
      body: {
        email: "hack@test.com",
        username: "hack",
        password: "x",
        role: "admin",
      },
    });
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });

  await runStep("6-Negative", "SV không tạo đề (403)", async () => {
    const { status } = await api("POST", "/exams", {
      token: tokens.student,
      body: {
        title: "Hack",
        admin_class_id: ctx.adminClassId,
        subject_id: ctx.subjectId,
        duration_min: 10,
      },
    });
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });
}

async function phase7_optional_ai(tokens: Tokens): Promise<void> {
  if (SKIP_AI) {
    log("  ⊘ Bỏ qua grade-predictor (E2E_SKIP_AI)");
    return;
  }
  await runStep("7-AI", "Grade predictor predict", async () => {
    await api("POST", "/grade-predictor/predict", {
      token: tokens.student,
      body: {},
      expectStatus: 200,
    });
  }, { allowFail: true });
}

async function cleanup(): Promise<void> {
  if (!CLEANUP || USE_EXISTING) return;
  log("\n🧹 Cleanup...");
  for (const examId of ctx.createdExamIds) {
    try {
      await pool.query("DELETE FROM exams WHERE id = $1", [examId]);
    } catch {
      /* ignore FK order */
    }
  }
  for (const uid of ctx.createdUserIds) {
    try {
      await pool.query("DELETE FROM accounts WHERE id = $1", [uid]);
    } catch {
      /* */
    }
  }
  for (const cid of ctx.createdClassIds) {
    try {
      await pool.query("DELETE FROM admin_classes WHERE id = $1", [cid]);
    } catch {
      /* */
    }
  }
  log("   Cleanup xong (một phần — xóa thủ công nếu còn FK).");
}

function printSummary(): void {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  log("\n════════════════════════════════════════");
  log(`KẾT QUẢ: ${passed}/${results.length} bước PASS`);
  if (failed.length) {
    log("\nFAILED:");
    for (const f of failed) {
      log(`  [${f.phase}] ${f.name}: ${f.detail}`);
    }
  }
  log("\nNgữ cảnh test:");
  log(`  exam_id=${ctx.examId ?? "—"}`);
  log(`  session_id=${ctx.sessionId ?? "—"}`);
  log(`  teacher=${ctx.teacherEmail ?? "—"}`);
  log(`  student=${ctx.studentEmail ?? "—"}`);
  log("════════════════════════════════════════\n");
}

async function main(): Promise<void> {
  log(`\n🚀 E2E Full Flow — runId=${RUN_ID}`);
  log(`   API: ${API_BASE}`);
  log(`   USE_EXISTING=${USE_EXISTING} CLEANUP=${CLEANUP}\n`);

  const tokens: Tokens = { admin: "", teacher: "", student: "" };

  try {
    await phase0_health();

    await runStep("1-Admin", "Đăng nhập admin", async () => {
      tokens.admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    await phase1_admin_setup(tokens);
    await phase2_teacher_exam(tokens);
    await phase3_student_exam(tokens);
    await phase4_teacher_grade(tokens);
    await phase5_password_reset(tokens);
    await phase6_negative(tokens);
    await phase7_optional_ai(tokens);

    printSummary();
    await cleanup();
    await pool.end();

    const failed = results.some((r) => !r.ok);
    process.exit(failed ? 1 : 0);
  } catch (e) {
    printSummary();
    console.error("\n❌ E2E dừng sớm:", e instanceof Error ? e.message : e);
    await cleanup().catch(() => undefined);
    await pool.end().catch(() => undefined);
    process.exit(1);
  }
}

main();
