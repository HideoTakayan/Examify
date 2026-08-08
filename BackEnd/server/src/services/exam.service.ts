import {
  getAllExams,
  queryExamsPaginated,
  getExamsByClass,
  getExamsByAdminClass,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  Exam,
  ExamDetail,
} from "~/models/exam.model";
import { getAdminClassById } from "~/models/adminClass.model";
import { getSubjectById } from "~/models/subject.model";
import { getProgramSubjectIds } from "~/services/subjectCatalog.service";
import {
  getPublicQuestionsByExam,
  getQuestionsByExam,
  createQuestion,
  deleteQuestion,
  updateQuestionForExam,
  Question,
  PublicQuestion,
  QuestionDifficulty,
  QuestionType,
} from "~/models/question.model";
import {
  getActiveSession,
  getActiveSessionsByExam,
  createSession,
  getSessionsByStudent,
  getSessionsByExam,
  getSessionById,
  finalizeSessionSubmit,
  getLatestSubmittedSession,
  getSessionForIntegrityLogging,
  sessionAllowsStudentReview,
  getSessionWithExam,
  updateSessionGrading,
  getSessionsByExamWithStudent,
  ExamSession,
  GradingStatus,
  SessionWithStudent,
} from "~/models/examsession.model";
import {
  ExamVersion,
  assignVersionIndex,
  unshuffleAnswers,
  originalKeyToDisplayKey,
  generateVersionPool,
  getVersionsByExam,
  createVersion,
  getVersionByIndex,
} from "~/models/examVersion.model";
import {
  insertIntegrityEvents,
  getIntegrityEventsByExam,
  countStrikeEventsBySession,
  IntegrityEventInput,
  IntegrityEventType,
} from "~/models/examIntegrity.model";
import {
  getRuntimeStateByExam,
} from "~/models/examRuntimeState.model";
import {
  AutosaveAnswers,
  getLatestAutosaveSnapshotBySession,
  upsertAutosaveSnapshot,
} from "~/models/examAutosave.model";
import pool from "~/config/db";
import {
  gradeMcqRecompute,
  mcqAnswersEqual,
  pickRecomputeMcqInput,
  resolveCorrectAnswerKey,
  resolveReviewCorrectKey,
  resolveSubmittedOriginalKey,
  normalizeLetterKey,
} from "~/utils/examMcqGrading";
import { createNotification } from "~/models/userNotification.model";
import { applyRetakeOnSessionStart } from "~/services/examRetake.service";
import { getApprovedRetakeGrant } from "~/models/examRetakeGrant.model";
import {
  isMalformedClosesAt,
  isPastClosesAt,
  normalizeClosesAtInput,
} from "~/utils/examStartDeadline";
import {
  assertValidExamSchedule,
  effectiveEndsAt,
  durationMinFromSchedule,
  isBeforeOpensAt,
  isMalformedScheduleAt,
  isPastEndsAt,
  normalizeScheduleAtInput,
} from "~/utils/examSchedule";
import { formatScoreScale10Pair } from "~/utils/gradeScale";
import {
  DISCONNECT_AUTOSAVE_GAP_MS,
  shouldAutoSubmitByViolationCount,
  STRIKE_EVENT_TYPES,
} from "~/utils/examIntegrityPolicy";
import { canManageExamRetake } from "~/services/examRetake.service";
import type { ImportedQuestionDraft } from "~/services/examImport.service";
import {
  buildLearningAssessmentSummary,
  type LearningAssessmentSummary,
} from "~/services/learningAssessmentSummary.service";

export function httpError(status: number, message: string): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

export const listExams = async (): Promise<ExamDetail[]> => getAllExams();

export const listExamsPaginated = async (
  filter: Parameters<typeof queryExamsPaginated>[0],
  limit: number,
  offset: number
) => queryExamsPaginated(filter, limit, offset);
export const listExamsByClass = async (classId: string): Promise<Exam[]> =>
  getExamsByClass(classId);
export const listExamsByAdminClass = async (adminClassId: string): Promise<Exam[]> =>
  getExamsByAdminClass(adminClassId);
export const getExam = async (id: string): Promise<ExamDetail | null> => getExamById(id);

export interface CreateExamScope {
  admin_class_id: string;
  subject_id: string;
  class_id?: string | null;
}

async function assertExamScope(
  scope: CreateExamScope,
  userId: string,
  role: string
): Promise<CreateExamScope> {
  const adminClass = await getAdminClassById(scope.admin_class_id);
  if (!adminClass) throw httpError(404, "Không tìm thấy lớp hành chính");
  if (role === "teacher" && adminClass.manager_teacher_id !== userId) {
    throw httpError(403, "Bạn không quản lý lớp này");
  }
  const subject = await getSubjectById(scope.subject_id);
  if (!subject) throw httpError(404, "Không tìm thấy môn học");
  if (!adminClass.program_id) {
    throw httpError(400, "Lớp hành chính chưa gán chuyên ngành");
  }
  const programSubjectIds = await getProgramSubjectIds(adminClass.program_id);
  if (!programSubjectIds.includes(scope.subject_id)) {
    throw httpError(
      403,
      "Môn học không thuộc chương trình đào tạo của chuyên ngành lớp bạn quản lý"
    );
  }
  return scope;
}

function validateScheduleFields(payload: {
  opens_at?: string | null;
  ends_at?: string | null;
  closes_at?: string | null;
}): void {
  if (isMalformedScheduleAt(payload.opens_at)) throw httpError(400, "opens_at không hợp lệ");
  if (isMalformedScheduleAt(payload.ends_at)) throw httpError(400, "ends_at không hợp lệ");
  if (isMalformedClosesAt(payload.closes_at)) throw httpError(400, "closes_at không hợp lệ");
  try {
    assertValidExamSchedule(
      normalizeScheduleAtInput(payload.opens_at),
      normalizeScheduleAtInput(payload.ends_at ?? payload.closes_at)
    );
  } catch (e) {
    throw httpError(400, e instanceof Error ? e.message : "Lịch thi không hợp lệ");
  }
}

export const createExamService = async (
  title: string,
  createdBy: string,
  durationMin: number,
  scope: CreateExamScope,
  role: string,
  description?: string,
  closesAt?: string | null,
  numVersions?: number,
  opensAt?: string | null,
  endsAt?: string | null
): Promise<Exam> => {
  validateScheduleFields({ opens_at: opensAt, ends_at: endsAt, closes_at: closesAt });
  const normOpens = normalizeScheduleAtInput(opensAt);
  const normEnds = normalizeScheduleAtInput(endsAt ?? closesAt);
  const scheduledDuration = durationMinFromSchedule(normOpens, normEnds);
  const effectiveDuration = scheduledDuration ?? durationMin;
  if (!scheduledDuration) {
    if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 300) {
      throw httpError(400, "duration_min phải từ 1 đến 300 phút");
    }
  }
  const normalized = normalizeClosesAtInput(closesAt);
  const validated = await assertExamScope(scope, createdBy, role);
  return createExam(title, createdBy, effectiveDuration, {
    description,
    closesAt: normalized,
    opensAt: normOpens,
    endsAt: normEnds,
    adminClassId: validated.admin_class_id,
    subjectId: validated.subject_id,
    classId: validated.class_id ?? null,
    numVersions,
  });
};

export const updateExamService = async (
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    duration_min?: number;
    closes_at?: string | null;
    opens_at?: string | null;
    ends_at?: string | null;
    num_versions?: number;
  }
): Promise<Exam | null> => {
  validateScheduleFields(payload);
  const fields: Partial<
    Pick<Exam, "title" | "description" | "duration_min" | "closes_at" | "opens_at" | "ends_at" | "num_versions">
  > = {};

  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) throw httpError(400, "title không hợp lệ");
    fields.title = title;
  }
  if (payload.description !== undefined) {
    fields.description = payload.description;
  }
  if (payload.duration_min !== undefined) {
    const duration = Number(payload.duration_min);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300) {
      throw httpError(400, "duration_min phải từ 1 đến 300 phút");
    }
    fields.duration_min = Math.floor(duration);
  }
  if (payload.closes_at !== undefined) {
    fields.closes_at = normalizeClosesAtInput(payload.closes_at);
  }
  if (payload.opens_at !== undefined) {
    fields.opens_at = normalizeScheduleAtInput(payload.opens_at);
  }
  if (payload.ends_at !== undefined) {
    fields.ends_at = normalizeScheduleAtInput(payload.ends_at);
  }
  if (payload.num_versions !== undefined) {
    const n = Number(payload.num_versions);
    if (!Number.isFinite(n) || n < 1 || n > 4) {
      throw httpError(400, "num_versions phải từ 1 đến 4");
    }
    fields.num_versions = Math.floor(n);
  }

  if (
    fields.opens_at !== undefined ||
    fields.ends_at !== undefined ||
    fields.closes_at !== undefined
  ) {
    const current = await getExamById(id);
    if (!current) return null;
    validateScheduleFields({
      opens_at: fields.opens_at ?? current.opens_at,
      ends_at: fields.ends_at ?? current.ends_at ?? current.closes_at,
      closes_at: fields.closes_at ?? current.closes_at,
    });
    const mergedOpens = fields.opens_at ?? current.opens_at;
    const mergedEnds = fields.ends_at ?? current.ends_at ?? current.closes_at;
    const fromSchedule = durationMinFromSchedule(mergedOpens, mergedEnds);
    if (fromSchedule != null) {
      fields.duration_min = fromSchedule;
    }
  }

  return updateExam(id, fields);
};

export const deleteExamService = async (id: string): Promise<boolean> => deleteExam(id);

export const getQuestionsForStudent = async (examId: string): Promise<PublicQuestion[]> =>
  getPublicQuestionsByExam(examId);

export const getQuestionsForTeacher = async (examId: string): Promise<Question[]> =>
  getQuestionsByExam(examId);

export const addQuestion = async (
  examId: string,
  content: string,
  points: number,
  questionType: QuestionType,
  options?: Record<string, string> | null,
  correctAnswer?: string | string[] | null,
  mediaUrl?: string | null,
  displayOrder?: number,
  versionIndex?: number,
  questionBankId?: string | null,
  difficulty?: QuestionDifficulty,
  chapter?: number | null,
  chapterLabel?: string | null,
  answerHint?: string | null
): Promise<Question> => {
  if (!Number.isInteger(chapter) || Number(chapter) <= 0) {
    throw httpError(400, "Câu hỏi bắt buộc phải có chương hợp lệ");
  }
  if (questionType === "mcq") {
    if (!options || Object.keys(options).length === 0) {
      throw httpError(400, "Câu trắc nghiệm cần options");
    }
    if (correctAnswer === undefined || correctAnswer === null) {
      throw httpError(400, "Câu trắc nghiệm cần correct_answer");
    }
  }
  return createQuestion(
    examId,
    content,
    questionType,
    points,
    options ?? null,
    correctAnswer ?? null,
    mediaUrl ?? null,
    displayOrder,
    versionIndex ?? 0,
    questionBankId ?? null,
    difficulty ?? "TRUNGBINH",
    chapter ?? null,
    chapterLabel ?? null,
    answerHint ?? null
  );
};

export const removeQuestion = async (id: string): Promise<boolean> => deleteQuestion(id);

export const updateQuestionInExam = async (
  examId: string,
  questionId: string,
  body: {
    content: string;
    points: number;
    question_type: QuestionType;
    options?: Record<string, string> | null;
    correct_answer?: string | string[] | null;
    media_url?: string | null;
    display_order: number;
    difficulty?: QuestionDifficulty;
    chapter?: number | null;
    chapter_label?: string | null;
    answer_hint?: string | null;
  }
): Promise<Question> => {
  const qt = body.question_type;
  if (!Number.isInteger(body.chapter) || Number(body.chapter) <= 0) {
    throw httpError(400, "Câu hỏi bắt buộc phải có chương hợp lệ");
  }
  if (qt === "mcq") {
    if (!body.options || Object.keys(body.options).length === 0) {
      throw httpError(400, "Câu trắc nghiệm cần options");
    }
    if (body.correct_answer === undefined || body.correct_answer === null) {
      throw httpError(400, "Câu trắc nghiệm cần correct_answer");
    }
  }
  const updated = await updateQuestionForExam(questionId, examId, {
    content: body.content.trim(),
    question_type: qt,
    points: Number(body.points),
    options: qt === "essay" ? null : body.options ?? null,
    correct_answer: qt === "essay" ? null : body.correct_answer ?? null,
    media_url: body.media_url ?? null,
    display_order: body.display_order,
    difficulty: body.difficulty,
    chapter: body.chapter,
    chapter_label: body.chapter_label,
    answer_hint: body.answer_hint,
  });
  if (!updated) throw httpError(404, "Không tìm thấy câu hỏi");
  return updated;
};

export interface CreateExamWithQuestionsPayload {
  title: string;
  admin_class_id: string;
  subject_id: string;
  class_id?: string | null;
  created_by: string;
  role: string;
  duration_min: number;
  num_versions?: number;
  description?: string | null;
  closes_at?: string | null;
  opens_at?: string | null;
  ends_at?: string | null;
  questions: ImportedQuestionDraft[];
}

function validateQuestionDraft(question: ImportedQuestionDraft, index: number) {
  const label = `Câu ${index + 1}`;
  if (!question.content?.trim()) throw httpError(400, `${label}: thiếu nội dung`);
  if (!Number.isInteger(question.chapter) || Number(question.chapter) <= 0) {
    throw httpError(400, `${label}: bắt buộc phải có [CHUONG:x] hợp lệ`);
  }
  if (question.question_type !== "mcq" && question.question_type !== "essay") {
    throw httpError(400, `${label}: question_type không hợp lệ`);
  }
  if (!Number.isFinite(question.points) || question.points <= 0) {
    throw httpError(400, `${label}: points phải lớn hơn 0`);
  }
  if (question.question_type === "mcq") {
    if (!question.options || Object.keys(question.options).length < 2) {
      throw httpError(400, `${label}: câu trắc nghiệm cần ít nhất 2 lựa chọn`);
    }
    if (question.correct_answer == null || question.correct_answer === "") {
      throw httpError(400, `${label}: câu trắc nghiệm cần đáp án đúng`);
    }
  }
}

export const createExamWithQuestionsService = async (
  payload: CreateExamWithQuestionsPayload
): Promise<{ exam: Exam; questions: Question[] }> => {
  if (!payload.title?.trim()) throw httpError(400, "title không hợp lệ");
  if (!payload.admin_class_id || !payload.subject_id) {
    throw httpError(400, "admin_class_id và subject_id là bắt buộc");
  }
  const scope = await assertExamScope(
    {
      admin_class_id: payload.admin_class_id,
      subject_id: payload.subject_id,
      class_id: payload.class_id,
    },
    payload.created_by,
    payload.role
  );
  validateScheduleFields(payload);
  const normOpens = normalizeScheduleAtInput(payload.opens_at);
  const normEnds = normalizeScheduleAtInput(payload.ends_at ?? payload.closes_at);
  const scheduledDuration = durationMinFromSchedule(normOpens, normEnds);
  const effectiveDuration = scheduledDuration ?? payload.duration_min;
  if (!scheduledDuration) {
    if (!Number.isFinite(payload.duration_min) || payload.duration_min <= 0 || payload.duration_min > 300) {
      throw httpError(400, "duration_min phải từ 1 đến 300 phút");
    }
  }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw httpError(400, "questions là mảng bắt buộc");
  }
  payload.questions.forEach(validateQuestionDraft);
  const numVersions = payload.num_versions ?? 2;
  for (let v = 0; v < numVersions; v += 1) {
    const count = payload.questions.filter((q) => (q.version_index ?? 0) === v).length;
    if (count === 0) {
      throw httpError(400, `Mã đề D${String(v + 1).padStart(2, "0")} chưa có câu hỏi — cần import file Word riêng cho từng đề`);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const examResult = await client.query(
      `INSERT INTO exams (title, description, class_id, admin_class_id, subject_id, created_by, duration_min, num_versions, closes_at, opens_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        payload.title.trim(),
        payload.description ?? null,
        scope.class_id ?? null,
        scope.admin_class_id,
        scope.subject_id,
        payload.created_by,
        Math.floor(effectiveDuration),
        numVersions,
        normalizeClosesAtInput(payload.closes_at),
        normOpens,
        normEnds,
      ]
    );
    const exam = examResult.rows[0] as Exam;
    const insertedQuestions: Question[] = [];

    for (let i = 0; i < payload.questions.length; i += 1) {
      const q = payload.questions[i];
      const opts = q.question_type === "essay" ? null : JSON.stringify(q.options ?? {});
      const correct =
        q.question_type === "essay" || q.correct_answer == null
          ? null
          : JSON.stringify(q.correct_answer);
      const mediaUrl =
        q.media?.url ??
        ("media_url" in q && typeof (q as { media_url?: unknown }).media_url === "string"
          ? (q as { media_url: string }).media_url
          : null) ??
        null;
      const versionIndex = Math.max(0, Math.min(3, Number(q.version_index ?? 0)));
      const bankId =
        "question_bank_id" in q && typeof (q as { question_bank_id?: unknown }).question_bank_id === "string"
          ? (q as { question_bank_id: string }).question_bank_id
          : null;
      const questionResult = await client.query(
        `INSERT INTO questions (
           exam_id, content, question_type, options, correct_answer, media_url,
           points, display_order, version_index, question_bank_id, difficulty, chapter, chapter_label, answer_hint
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          exam.id,
          q.content.trim(),
          q.question_type,
          opts,
          correct,
          mediaUrl,
          q.points,
          q.display_order || i + 1,
          versionIndex,
          bankId,
          q.difficulty ?? "TRUNGBINH",
          q.chapter ?? null,
          q.chapter_label ?? null,
          q.answer_hint ?? null,
        ]
      );
      if (bankId) {
        await client.query(
          `UPDATE question_bank SET usage_count = usage_count + 1 WHERE id = $1`,
          [bankId]
        );
      }
      const row = questionResult.rows[0];
      insertedQuestions.push({
        id: row.id,
        exam_id: row.exam_id,
        content: row.content,
        question_type: row.question_type === "essay" ? "essay" : "mcq",
        options: row.options ?? null,
        correct_answer: row.correct_answer ?? null,
        media_url: row.media_url ?? null,
        difficulty: row.difficulty ?? "TRUNGBINH",
        chapter: row.chapter != null ? Number(row.chapter) : null,
        chapter_label: row.chapter_label ?? null,
        answer_hint: row.answer_hint ?? null,
        points: Number(row.points),
        display_order: Number(row.display_order ?? i + 1),
        version_index: Number(row.version_index ?? 0),
        explanation: null,
        created_at: row.created_at,
      });
    }

    await client.query("COMMIT");
    await ensureVersionPool(exam.id);
    return { exam, questions: insertedQuestions };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const startSession = async (examId: string, studentId: string): Promise<ExamSession> => {
  const existing = await getActiveSession(examId, studentId);
  if (existing) return existing;
  return createSession(examId, studentId);
};

export interface StartSessionPayload {
  session: ExamSession;
  deadline_at: string;
  duration_min: number;
}

export interface StartSessionPayload {
  session: ExamSession;
  deadline_at: string;
  duration_min: number;
  version_code: string;
  version_id: string;
  questions: Array<{
    id: string;
    display_order: number;
    content: string;
    question_type: QuestionType;
    options: Record<string, string> | null;
    points: number;
    media_url: string | null;
  }>;
  /** null if exam has not been started by teacher yet */
  runtime_state: {
    started_at: string;
    ends_at: string;
    is_active: boolean;
  } | null;
  /** Bản nháp mới nhất trên server (khôi phục khi đổi thiết bị / xóa cache) */
  autosave: {
    saved_at: string;
    answers: AutosaveAnswers;
  } | null;
}

export const startSessionWithMeta = async (
  examId: string,
  studentId: string
): Promise<StartSessionPayload> => {
  const exam = await getExamById(examId);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");
  const nowMs = Date.now();
  if (exam.opens_at && isBeforeOpensAt(exam.opens_at, nowMs)) {
    const runtimeState = await getRuntimeStateByExam(examId);
    const earlyManualOpen = runtimeState?.is_active && new Date(runtimeState.ends_at).getTime() > nowMs;
    if (!earlyManualOpen) {
      throw httpError(400, "Chưa đến giờ mở thi");
    }
  }
  const endAt = effectiveEndsAt(exam);
  if (endAt && isPastEndsAt(endAt, nowMs)) {
    throw httpError(400, "Đã quá hạn nộp bài thi");
  }
  if (!endAt && exam.closes_at && isPastClosesAt(exam.closes_at, nowMs)) {
    throw httpError(400, "Đã quá hạn bắt đầu bài thi");
  }

  // Ensure version pool exists (lazy-create)
  await ensureVersionPool(examId);

  // Get total versions
  const versions = await getVersionsByExam(examId);
  if (versions.length === 0) throw httpError(500, "Không có mã đề cho kỳ thi này");

  // Round-robin assignment based on existing session count for this exam
  const sessionCountResult = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM exam_sessions WHERE exam_id = $1`,
    [examId]
  );
  const sessionCount = Number(sessionCountResult.rows[0]?.cnt ?? 0);
  const versionIdx = sessionCount % versions.length;
  const version = versions[versionIdx];

  // Create or reuse session (update version if already exists)
  let session = await getActiveSession(examId, studentId);
  if (!session) {
    const alreadySubmitted = await getLatestSubmittedSession(examId, studentId);
    if (alreadySubmitted) {
      const grant = await getApprovedRetakeGrant(examId, studentId);
      if (!grant) {
        throw httpError(409, "Bạn đã nộp bài thi này. Xem kết quả tại mục Kết quả.");
      }
    }
  }
  if (session) {
    // Update version on existing session if not already set
    if (!session.version_id) {
      await pool.query(
        `UPDATE exam_sessions SET version_id = $1, version_code = $2 WHERE id = $3`,
        [version.id, version.version_code, session.id]
      );
      session = await getSessionById(session.id);
      if (!session) throw httpError(500, "Không thể cập nhật phiên thi");
    }
  } else {
    session = await pool.query(
      `INSERT INTO exam_sessions (exam_id, student_id, version_id, version_code, started_at, status)
       VALUES ($1, $2, $3, $4, NOW(), 'active') RETURNING *`,
      [examId, studentId, version.id, version.version_code]
    ).then((r) => r.rows[0] as ExamSession);
    if (!session) throw httpError(500, "Không thể tạo phiên thi");
    await applyRetakeOnSessionStart(examId, studentId, session.id);
  }

  const started = new Date(session.started_at).getTime();
  const deadline = started + exam.duration_min * 60 * 1000;

  // Return questions in shuffled order with shuffled options
  const questions = await getQuestionsByExam(examId);
  const shuffledQuestions = version.question_order
    .map((qId) => questions.find((q) => q.id === qId))
    .filter(Boolean) as Question[];

  const shuffledPayload = shuffledQuestions.map((q) => ({
    id: q.id,
    display_order: 0, // will be set by FE based on array index
    content: q.content,
    question_type: q.question_type,
    options: q.options
      ? buildShuffledOptionsForStudent(q.options, version.option_maps[q.id] ?? {})
      : null,
    points: q.points,
    media_url: q.media_url ?? null,
  }));

  // Check if exam has been started (runtime state exists)
  const runtimeState = await getRuntimeStateByExam(examId);
  const autosaveSnapshot = await getLatestAutosaveSnapshotBySession(session.id);

  return {
    session,
    deadline_at: new Date(deadline).toISOString(),
    duration_min: exam.duration_min,
    version_code: version.version_code,
    version_id: version.id,
    questions: shuffledPayload,
    runtime_state: runtimeState && runtimeState.is_active
      ? {
          started_at: runtimeState.started_at,
          ends_at: runtimeState.ends_at,
          is_active: true,
        }
      : null,
    autosave: autosaveSnapshot
      ? { saved_at: autosaveSnapshot.saved_at, answers: autosaveSnapshot.answers }
      : null,
  };
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function ensureVersionPool(examId: string): Promise<void> {
  const existing = await getVersionsByExam(examId);
  if (existing.length > 0) return; // already generated

  const exam = await getExamById(examId);
  if (!exam) return;

  const questions = await getQuestionsByExam(examId);
  if (questions.length === 0) return;

  const numVersions = exam.num_versions ?? 2;

  for (let v = 0; v < numVersions; v += 1) {
    const versionQuestions = questions.filter((q) => (q.version_index ?? 0) === v);
    if (versionQuestions.length === 0) continue;

    const questionIds = versionQuestions.map((q) => q.id);
    const questionOptions: Record<string, Record<string, string>> = {};
    for (const q of versionQuestions) {
      if (q.options) {
        questionOptions[q.id] = { ...q.options };
      } else {
        questionOptions[q.id] = { A: "A", B: "B", C: "C", D: "D" };
      }
    }

    // Một lần xáo câu + đáp án cho toàn bộ SV cùng mã đề (D01, D02, …)
    const pool = generateVersionPool(questionIds, questionOptions, 1);
    const shuffled = pool[0];
    const versionCode = `D${String(v + 1).padStart(2, "0")}`;
    await createVersion(examId, versionCode, v, shuffled.questionOrder, shuffled.optionMaps);
  }
}

/** Build options shown to student: display label → answer text */
function buildShuffledOptionsForStudent(
  original: Record<string, string>,
  optionMap: Record<string, string>
): Record<string, string> {
  if (Object.keys(optionMap).length === 0) return { ...original };

  const mapValues = Object.values(optionMap);
  const looksLikeKeyMap = mapValues.every((v) => /^[A-Z]$/i.test(String(v).trim()));

  if (looksLikeKeyMap) {
    const result: Record<string, string> = {};
    for (const [displayKey, originalKey] of Object.entries(optionMap)) {
      result[displayKey] = original[originalKey] ?? "";
    }
    return result;
  }

  // Legacy rows: option_maps stored display text directly
  return { ...optionMap };
}

export interface GradedDetailRow {
  question_id: string;
  question_type: QuestionType;
  submitted: string | string[] | null;
  correct?: string | string[] | null;
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
  teacher_comment?: string | null;
}

export interface SubmitResult {
  session: ExamSession;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  grading_status: GradingStatus;
  learning_assessment_summary?: LearningAssessmentSummary;
  details: Array<{
    question_id: string;
    question_type: QuestionType;
    submitted: string | string[] | null;
    correct?: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
  }>;
}

const MAX_INTEGRITY_BATCH = 200;
const MAX_INTEGRITY_DETAILS_BYTES = 8 * 1024;
const MAX_AUTOSAVE_BYTES = 2 * 1024 * 1024;

const INTEGRITY_TYPES: Set<IntegrityEventType> = new Set([
  "exam_opened",
  "fullscreen_enter",
  "fullscreen_exit",
  "fullscreen_error",
  "visibility_hidden",
  "window_blur",
  "window_focus",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "before_unload",
]);

function isRecordObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidIsoDate(value: string): boolean {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  return new Date(t).toISOString() === value;
}

export function normalizeIntegrityEvents(events: unknown): IntegrityEventInput[] {
  if (!Array.isArray(events) || events.length === 0) {
    throw httpError(400, "events là mảng bắt buộc");
  }
  if (events.length > MAX_INTEGRITY_BATCH) {
    throw httpError(400, `events vượt quá giới hạn ${MAX_INTEGRITY_BATCH}`);
  }

  const normalized: IntegrityEventInput[] = [];
  for (const rawEvent of events) {
    if (!isRecordObject(rawEvent)) {
      throw httpError(400, "event không hợp lệ");
    }

    const type = rawEvent.type;
    const at = rawEvent.at;

    if (typeof type !== "string" || !INTEGRITY_TYPES.has(type as IntegrityEventType)) {
      throw httpError(400, "event.type không hợp lệ");
    }
    if (typeof at !== "string" || !isValidIsoDate(at)) {
      throw httpError(400, "event.at phải là ISO datetime hợp lệ");
    }

    const details = rawEvent.details;
    if (details !== undefined && !isRecordObject(details)) {
      throw httpError(400, "event.details phải là object");
    }
    if (details) {
      const size = Buffer.byteLength(JSON.stringify(details), "utf8");
      if (size > MAX_INTEGRITY_DETAILS_BYTES) {
        throw httpError(413, "event.details vượt quá 8KB");
      }
    }

    normalized.push({
      type: type as IntegrityEventType,
      at,
      details,
    });
  }

  return normalized;
}

export interface IntegrityPersistResult {
  accepted: number;
  rejected: number;
}

export const persistIntegrityEventsService = async (
  examId: string,
  studentId: string,
  events: IntegrityEventInput[]
): Promise<IntegrityPersistResult> => {
  if (!examId) throw httpError(400, "exam_id là bắt buộc");

  const session = await getSessionForIntegrityLogging(examId, studentId);
  if (!session) {
    throw httpError(403, "Không tìm thấy phiên thi của bạn cho kỳ thi này");
  }

  const accepted = await insertIntegrityEvents(examId, session.id, studentId, events);

  const { emitProctoringIntegrityUpdate } = await import("~/socket/examSocket");
  emitProctoringIntegrityUpdate(examId, {
    session_id: session.id,
    student_id: studentId,
    accepted,
  });

  if (session.status === "active") {
    const strikeCount = await countStrikeEventsBySession(session.id);
    if (shouldAutoSubmitByViolationCount(strikeCount)) {
      try {
        await forceSubmitOneActiveSession(session);
        const { emitViolationConfirmed } = await import("~/socket/examSocket");
        emitViolationConfirmed(session.id, {
          acknowledged: true,
          violation_id: `server_strikes_${strikeCount}`,
          session_status: "submitted",
          auto_submit_triggered: true,
          message: `Đã ghi nhận ${strikeCount} vi phạm. Hệ thống tự động nộp bài.`,
        });
      } catch (err) {
        console.error(
          `[integrity] auto-submit after ${strikeCount} strikes failed session=${session.id}`,
          err
        );
      }
    }
  }

  return {
    accepted,
    rejected: Math.max(0, events.length - accepted),
  };
};

function normalizeAutosaveAnswers(rawAnswers: unknown): AutosaveAnswers {
  if (!isRecordObject(rawAnswers)) {
    throw httpError(400, "answers phải là object");
  }

  const out: AutosaveAnswers = {};
  for (const [k, v] of Object.entries(rawAnswers)) {
    if (typeof v !== "string") {
      throw httpError(400, "answers chỉ chấp nhận giá trị string");
    }
    out[k] = v;
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(out), "utf8");
  if (payloadSize > MAX_AUTOSAVE_BYTES) {
    throw httpError(413, "answers vượt quá giới hạn 2MB");
  }

  return out;
}

export interface AutosavePersistResult {
  saved: true;
  server_time: string;
}

export const persistAutosaveSnapshotService = async (payload: {
  examId: string;
  studentId: string;
  savedAt: string;
  answers: unknown;
}): Promise<AutosavePersistResult> => {
  if (!payload.examId) throw httpError(400, "exam_id là bắt buộc");
  if (!payload.savedAt || !isValidIsoDate(payload.savedAt)) {
    throw httpError(400, "saved_at phải là ISO datetime hợp lệ");
  }

  const session = await getActiveSession(payload.examId, payload.studentId);
  if (!session) {
    throw httpError(409, "Phiên thi không còn active");
  }

  const answers = normalizeAutosaveAnswers(payload.answers);

  const snapshot = await upsertAutosaveSnapshot({
    examId: payload.examId,
    sessionId: session.id,
    studentId: payload.studentId,
    savedAt: payload.savedAt,
    answers,
  });

  return {
    saved: true,
    server_time: snapshot.server_at,
  };
};

function buildOriginalOptionsByQuestion(
  questions: Question[]
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const q of questions) {
    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      out[q.id] = q.options as Record<string, string>;
    }
  }
  return out;
}

export function autosaveToDisplayIndexAnswers(
  raw: AutosaveAnswers
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const match = /^q(\d+)$/i.exec(key);
    if (match) {
      out[String(Number(match[1]) - 1)] = value.trim();
    }
  }
  return out;
}

async function getVersionMapsForSession(
  session: ExamSession
): Promise<{
  questionOrder: string[];
  optionMaps: Record<string, Record<string, string>>;
} | null> {
  if (!session.version_id) return null;
  const versionRow = await pool
    .query(`SELECT question_order, option_maps FROM exam_versions WHERE id = $1`, [
      session.version_id,
    ])
    .then((r) => r.rows[0]);
  if (!versionRow) return null;
  return {
    questionOrder: versionRow.question_order as string[],
    optionMaps: versionRow.option_maps as Record<string, Record<string, string>>,
  };
}

function parseStudentAnswers(raw: unknown): Record<string, string | string[]> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, string | string[]>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, string | string[]>;
  return {};
}

/** Sửa chấm TN khi option_maps cũ hoặc graded_details lưu sai */
async function recomputeMcqGradingForSession(
  session: ExamSession,
  allQuestions: Question[],
  existingDetails: GradedDetailRow[]
): Promise<{
  graded_details: GradedDetailRow[];
  score: number;
  student_answers: Record<string, string | string[]>;
  changed: boolean;
}> {
  const versionMaps = await getVersionMapsForSession(session);
  const originalOptionsByQuestion = buildOriginalOptionsByQuestion(allQuestions);

  /** Autosave FE: { q1: "B" } — B là display key (ô SV bấm), không unshuffle. */
  const displayByIndex: Record<string, string> = {};
  const snapshot = await getLatestAutosaveSnapshotBySession(session.id);
  if (snapshot?.answers) {
    Object.assign(displayByIndex, autosaveToDisplayIndexAnswers(snapshot.answers));
  }

  const questionOrder = versionMaps
    ? versionMaps.questionOrder
    : allQuestions.map((q) => q.id);

  /** student_answers sau submit: { [question_id]: original_key } */
  const originalByQuestionId: Record<string, string> = {};
  const orderSet = new Set(questionOrder);
  const fromStudent = parseStudentAnswers(session.student_answers);
  for (const [key, value] of Object.entries(fromStudent)) {
    if (typeof value !== "string" || !/^[A-D]$/i.test(value.trim())) continue;
    const letter = value.trim().toUpperCase();
    if (orderSet.has(key)) {
      originalByQuestionId[key] = letter;
      continue;
    }
    const idx = parseInt(key, 10);
    if (Number.isFinite(idx) && String(idx) === key.trim()) {
      displayByIndex[String(idx)] = letter;
    }
  }

  /** Đã nộp: student_answers là source of truth; autosave có thể stale (flush sau submit). */
  const preferSubmittedSource =
    session.status === "submitted" || Object.keys(originalByQuestionId).length > 0;

  const existingByQ = new Map(existingDetails.map((d) => [d.question_id, d]));
  let score = 0;
  let changed = false;
  const gradedRows: GradedDetailRow[] = [];
  const unshuffled: Record<string, string | string[]> = {};

  for (let i = 0; i < questionOrder.length; i += 1) {
    const qId = questionOrder[i];
    const q = allQuestions.find((item) => item.id === qId);
    if (!q) continue;
    const prev = existingByQ.get(qId);

    if (q.question_type === "essay") {
      const essayFromDisplay = displayByIndex[String(i)];
      const essayFromStudent = fromStudent[qId];
      const essayFromStudentStr =
        typeof essayFromStudent === "string" ? essayFromStudent : undefined;
      const essayRaw = preferSubmittedSource
        ? essayFromStudentStr ?? essayFromDisplay ?? prev?.submitted
        : essayFromDisplay ?? essayFromStudentStr ?? prev?.submitted;
      const essayText =
        essayRaw === null || essayRaw === undefined
          ? ""
          : Array.isArray(essayRaw)
            ? essayRaw.join("\n")
            : String(essayRaw);
      const pointsEarned = prev?.points_earned ?? null;
      if (pointsEarned != null) score += Number(pointsEarned);
      const row: GradedDetailRow = {
        question_id: q.id,
        question_type: "essay",
        submitted: essayText,
        is_correct: false,
        points_earned: pointsEarned,
        max_points: Number(q.points),
        pending_grading: prev?.pending_grading ?? true,
        teacher_comment: prev?.teacher_comment ?? null,
      };
      if (
        prev &&
        (prev.points_earned !== row.points_earned ||
          prev.pending_grading !== row.pending_grading)
      ) {
        changed = true;
      }
      gradedRows.push(row);
      continue;
    }

    const optionMap = versionMaps?.optionMaps[qId];
    const opts = originalOptionsByQuestion[qId];
    const recomputeInput = pickRecomputeMcqInput(
      i,
      qId,
      displayByIndex,
      originalByQuestionId,
      prev?.submitted,
      { preferSubmittedSource }
    );
    const graded = gradeMcqRecompute(
      recomputeInput,
      q.correct_answer,
      optionMap,
      opts
    );
    const submitted = graded.originalKey;
    if (submitted) unshuffled[qId] = submitted;

    const pointsEarned = graded.isCorrect ? Number(q.points) : 0;
    score += pointsEarned;

    const row: GradedDetailRow = {
      question_id: q.id,
      question_type: "mcq",
      submitted,
      correct: graded.correctKey,
      is_correct: graded.isCorrect,
      points_earned: pointsEarned,
      max_points: Number(q.points),
      pending_grading: false,
    };
    if (
      !prev ||
      prev.is_correct !== row.is_correct ||
      prev.points_earned !== row.points_earned ||
      JSON.stringify(prev.submitted) !== JSON.stringify(row.submitted)
    ) {
      changed = true;
    }
    gradedRows.push(row);
  }

  return { graded_details: gradedRows, score, student_answers: unshuffled, changed };
}

function parseGradedDetails(raw: unknown): GradedDetailRow[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as GradedDetailRow[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as GradedDetailRow[];
  return [];
}

/** Bỏ câu trong graded_details không còn thuộc đề (sau khi GV sửa/xóa câu tự luận). */
function alignGradedDetailsToExam(
  gradedDetails: GradedDetailRow[],
  allQuestions: Question[]
): {
  details: GradedDetailRow[];
  changed: boolean;
  score: number;
  gradingStatus: GradingStatus;
} {
  const validIds = new Set(allQuestions.map((q) => q.id));
  const details = gradedDetails.filter((d) => validIds.has(d.question_id));
  const changed = details.length !== gradedDetails.length;
  const score = details.reduce(
    (s, d) => s + (d.points_earned != null ? Number(d.points_earned) : 0),
    0
  );
  const gradingStatus: GradingStatus = details.some(
    (d) => d.question_type === "essay" && d.pending_grading
  )
    ? "pending_manual"
    : "complete";
  return { details, changed, score, gradingStatus };
}

export const submitSessionService = async (
  sessionId: string,
  studentId: string,
  answers: Record<string, string | string[]>,
  options?: {
    allowPastDeadline?: boolean;
    submitSource?: ExamSession["submit_source"];
    disconnectFlag?: boolean;
  }
): Promise<SubmitResult> => {
  const session = await getSessionById(sessionId);
  if (!session) throw httpError(404, "Phiên thi không tồn tại");
  if (session.student_id !== studentId) throw httpError(403, "Không có quyền nộp bài");
  if (session.status !== "active") throw httpError(400, "Phiên thi đã kết thúc");

  const exam = await getExamById(session.exam_id);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");

  const deadline = new Date(session.started_at).getTime() + exam.duration_min * 60 * 1000;
  const allowPastDeadline = options?.allowPastDeadline === true;
  if (!allowPastDeadline && Date.now() > deadline) {
    throw httpError(400, "Đã hết thời gian làm bài");
  }

  const allQuestions = await getQuestionsByExam(session.exam_id);
  const originalOptionsByQuestion = buildOriginalOptionsByQuestion(allQuestions);

  let questionOrder: string[];
  let unshuffledAnswers: Record<string, string | string[]>;

  const versionMaps = await getVersionMapsForSession(session);
  if (versionMaps) {
    questionOrder = versionMaps.questionOrder;
    unshuffledAnswers = unshuffleAnswers(
      answers,
      questionOrder,
      versionMaps.optionMaps,
      originalOptionsByQuestion
    );
  } else {
    const orderedIds = allQuestions.map((q) => q.id);
    questionOrder = orderedIds;
    const byQuestionId: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(answers)) {
      const idx = parseInt(key, 10);
      if (Number.isFinite(idx) && String(idx) === key.trim()) {
        const qid = orderedIds[idx];
        if (qid) byQuestionId[qid] = value;
      } else if (orderedIds.includes(key)) {
        byQuestionId[key] = value;
      }
    }
    unshuffledAnswers = byQuestionId;
  }

  let score = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let hasEssay = false;

  const gradedRows: GradedDetailRow[] = questionOrder.map((qId) => {
    const q = allQuestions.find(q => q.id === qId);
    if (!q) return null;
    totalPoints += Number(q.points);
    const submitted = unshuffledAnswers[qId] ?? null;

    if (q.question_type === "essay") {
      hasEssay = true;
      const text =
        submitted === null || submitted === undefined
          ? ""
          : Array.isArray(submitted)
            ? submitted.join("\n")
            : String(submitted);
      return {
        question_id: q.id,
        question_type: "essay",
        submitted: text,
        is_correct: false,
        points_earned: null,
        max_points: Number(q.points),
        pending_grading: true,
        teacher_comment: null,
      };
    }

    const correct = q.correct_answer;
    const correctKey = resolveCorrectAnswerKey(correct);
    const optionMap = versionMaps?.optionMaps[qId];
    const submittedOriginal =
      submitted !== undefined && submitted !== null
        ? resolveSubmittedOriginalKey(
            submitted,
            correct,
            optionMap,
            originalOptionsByQuestion[qId]
          )
        : null;
    const isCorrect =
      submittedOriginal !== null && mcqAnswersEqual(submittedOriginal, correct);
    const pointsEarned = isCorrect ? Number(q.points) : 0;
    score += pointsEarned;
    if (isCorrect) correctCount++;

    return {
      question_id: q.id,
      question_type: "mcq",
      submitted: submittedOriginal ?? submitted,
      correct: correctKey,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      max_points: Number(q.points),
      pending_grading: false,
    };
  }).filter(Boolean) as GradedDetailRow[];

  const gradingStatus: GradingStatus = hasEssay ? "pending_manual" : "complete";
  const learningAssessmentSummary = buildLearningAssessmentSummary(
    allQuestions,
    gradedRows
  );

  const updated = await finalizeSessionSubmit(sessionId, {
    score,
    max_points: totalPoints,
    student_answers: unshuffledAnswers, // store in original (unshuffled) format
    graded_details: gradedRows,
    grading_status: gradingStatus,
    submit_source: options?.submitSource ?? "student",
    disconnect_flag: options?.disconnectFlag ?? false,
  });

  if (!updated) throw httpError(409, "Không thể nộp bài (phiên không còn active)");

  // Notify student of result (auto-grade: no essay)
  if (gradingStatus === "complete" && updated.student_id) {
    const examRow = await pool.query(
      `SELECT e.title FROM exams e WHERE e.id = (SELECT exam_id FROM exam_sessions WHERE id = $1)`,
      [sessionId]
    );
    const examTitle = examRow.rows[0]?.title ?? "Bài thi";
    const submittedAt = new Date().toLocaleString("vi-VN");
    void createNotification(
      updated.student_id,
      "[Kết quả] Điểm đã có",
      `Bài thi "${examTitle}" — Điểm: ${formatScoreScale10Pair(score, totalPoints)} — Đã nộp lúc ${submittedAt}`,
      "success"
    ).catch(() => { /* non-critical */ });
  } else if (gradingStatus === "pending_manual" && updated.student_id) {
    // Has essay — notify pending grading
    const examRow = await pool.query(
      `SELECT e.title FROM exams e WHERE e.id = (SELECT exam_id FROM exam_sessions WHERE id = $1)`,
      [sessionId]
    );
    const examTitle = examRow.rows[0]?.title ?? "Bài thi";
    void createNotification(
      updated.student_id,
      "[Thông báo] Bài đã được nộp",
      `Bài thi "${examTitle}" đã được nộp. Đang chờ giáo viên chấm điểm tự luận.`,
      "info"
    ).catch(() => { /* non-critical */ });
  }

  const studentDetails = gradedRows.map((d) => ({
    question_id: d.question_id,
    question_type: d.question_type,
    submitted: d.submitted,
    correct: d.question_type === "mcq" ? d.correct ?? null : null,
    is_correct: d.is_correct,
    points_earned: d.points_earned,
    max_points: d.max_points,
    pending_grading: d.pending_grading,
  }));

  return {
    session: updated,
    score,
    total_points: totalPoints,
    correct_count: correctCount,
    total_questions: questionOrder.length,
    grading_status: gradingStatus,
    learning_assessment_summary: learningAssessmentSummary,
    details: studentDetails,
  };
};

export interface MySubmissionView {
  session: ExamSession;
  score: number | null;
  max_points: number | null;
  grading_status: GradingStatus | null;
  details: SubmitResult["details"];
}

export const getMySubmissionForExam = async (
  examId: string,
  studentId: string
): Promise<MySubmissionView | null> => {
  const row = await getLatestSubmittedSession(examId, studentId);
  if (!row) return null;
  const details = parseGradedDetails(row.graded_details).map((d) => ({
    question_id: d.question_id,
    question_type: d.question_type,
    submitted: d.submitted,
    is_correct: d.is_correct,
    points_earned: d.points_earned,
    max_points: d.max_points,
    pending_grading: d.pending_grading,
  }));
  return {
    session: row,
    score: row.score != null ? Number(row.score) : null,
    max_points: row.max_points != null ? Number(row.max_points) : null,
    grading_status: row.grading_status,
    details,
  };
};

export interface ReviewDetailRow {
  question_id: string;
  question_type: QuestionType;
  content: string;
  options: Record<string, string> | null;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  chapter: number | null;
  chapter_label: string | null;
  submitted: string | string[] | null;
  correct: string | string[] | null;
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
  teacher_comment?: string | null;
}

export interface SessionReviewPayload {
  session: ExamSession;
  exam: ExamDetail;
  score: number | null;
  max_points: number | null;
  grading_status: GradingStatus | null;
  learning_assessment_summary?: LearningAssessmentSummary;
  questions: ReviewDetailRow[];
}

/** Đã chấm đúng lúc submit — không ghi đè bằng autosave khi mở review. */
async function gradedMcqLooksConsistent(
  session: ExamSession,
  gradedDetails: GradedDetailRow[],
  allQuestions: Question[]
): Promise<boolean> {
  const versionMaps = await getVersionMapsForSession(session);
  const mcqRows = gradedDetails.filter((d) => d.question_type === "mcq");
  if (mcqRows.length === 0) return true;
  return mcqRows.every((d) => {
    const q = allQuestions.find((item) => item.id === d.question_id);
    if (!q) return true;
    const storedCorrect = normalizeLetterKey(d.correct);
    const expectedCorrect = resolveReviewCorrectKey(q.correct_answer, q.options, d.correct);
    if (expectedCorrect && !storedCorrect) return false;
    if (d.submitted == null || d.submitted === "") return true;
    const optionMap = versionMaps?.optionMaps[d.question_id];
    const resolved = resolveSubmittedOriginalKey(
      d.submitted,
      q.correct_answer,
      optionMap,
      q.options
    );
    const expectCorrect = mcqAnswersEqual(resolved, q.correct_answer);
    return d.is_correct === expectCorrect;
  });
}

async function applyRecomputeIfNeeded(
  session: ExamSession,
  allQuestions: Question[],
  gradedDetails: GradedDetailRow[]
): Promise<{ session: ExamSession; gradedDetails: GradedDetailRow[] }> {
  if (
    session.status === "submitted" &&
    (await gradedMcqLooksConsistent(session, gradedDetails, allQuestions))
  ) {
    return { session, gradedDetails };
  }
  const recompute = await recomputeMcqGradingForSession(session, allQuestions, gradedDetails);
  if (!recompute.changed) {
    return { session, gradedDetails };
  }
  const hasPendingEssay = recompute.graded_details.some(
    (d) => d.question_type === "essay" && d.pending_grading
  );
  const gradingStatus: GradingStatus = hasPendingEssay ? "pending_manual" : "complete";
  const updated = await updateSessionGrading(session.id, {
    score: recompute.score,
    graded_details: recompute.graded_details,
    grading_status: gradingStatus,
    student_answers: recompute.student_answers,
  });
  if (updated) {
    return { session: updated, gradedDetails: recompute.graded_details };
  }
  return { session, gradedDetails: recompute.graded_details };
}

async function buildReviewQuestionsForSession(
  session: ExamSession,
  allQuestions: Question[],
  gradedDetails: GradedDetailRow[]
): Promise<ReviewDetailRow[]> {
  const versionMaps = await getVersionMapsForSession(session);
  const questionOrder = versionMaps?.questionOrder ?? allQuestions.map((q) => q.id);
  const questionsById = new Map(allQuestions.map((q) => [q.id, q]));
  const reviewQuestions: ReviewDetailRow[] = [];

  for (const qId of questionOrder) {
    const q = questionsById.get(qId);
    if (!q) continue;
    const detail = gradedDetails.find((d) => d.question_id === qId);
    const optionMap = versionMaps?.optionMaps[qId];
    const displayOptions =
      q.options && optionMap && Object.keys(optionMap).length > 0
        ? buildShuffledOptionsForStudent(q.options, optionMap)
        : q.options;
    const correctOriginal =
      q.question_type === "mcq"
        ? resolveReviewCorrectKey(q.correct_answer, q.options, detail?.correct)
        : null;
    const submittedRaw = detail?.submitted ?? null;
    const submittedOriginalResolved =
      q.question_type === "mcq"
        ? resolveSubmittedOriginalKey(
            submittedRaw,
            q.correct_answer,
            optionMap,
            q.options
          )
        : null;
    let submittedForUi: string | string[] | null = submittedRaw;
    let correctForUi: string | string[] | null = correctOriginal;
    if (optionMap && submittedOriginalResolved) {
      submittedForUi =
        originalKeyToDisplayKey(optionMap, submittedOriginalResolved) ??
        submittedOriginalResolved;
    }
    if (optionMap && correctOriginal) {
      correctForUi =
        originalKeyToDisplayKey(optionMap, correctOriginal) ?? correctOriginal;
    }
    const essayPoints =
      q.question_type === "essay" ? detail?.points_earned ?? null : null;
    const isCorrect =
      q.question_type === "mcq"
        ? mcqAnswersEqual(submittedOriginalResolved, q.correct_answer)
        : essayPoints != null && !detail?.pending_grading
          ? essayPoints >= Number(q.points)
          : false;
    reviewQuestions.push({
      question_id: q.id,
      question_type: q.question_type,
      content: q.content,
      options: displayOptions,
      explanation: q.explanation ?? null,
      difficulty: q.difficulty ?? "TRUNGBINH",
      chapter: q.chapter ?? null,
      chapter_label: q.chapter_label ?? null,
      submitted: submittedForUi,
      correct: correctForUi,
      is_correct: isCorrect,
      points_earned:
        q.question_type === "mcq"
          ? isCorrect
            ? Number(q.points)
            : 0
          : (detail?.points_earned ?? null),
      max_points: Number(q.points),
      pending_grading: detail?.pending_grading,
      teacher_comment: detail?.teacher_comment ?? null,
    });
  }
  return reviewQuestions;
}

async function repairGradedDetailsFromReview(
  session: ExamSession,
  gradedDetails: GradedDetailRow[],
  reviewQuestions: ReviewDetailRow[],
  allQuestions: Question[]
): Promise<{ session: ExamSession; gradedDetails: GradedDetailRow[] }> {
  const repaired = gradedDetails.map((d) => ({ ...d }));
  let changed = false;

  for (const rq of reviewQuestions) {
    if (rq.question_type !== "mcq") continue;
    const idx = repaired.findIndex((d) => d.question_id === rq.question_id);
    if (idx < 0) continue;
    const q = allQuestions.find((item) => item.id === rq.question_id);
    const prev = repaired[idx];
    const pointsEarned = rq.is_correct ? Number(rq.max_points) : 0;
    const correctKey = q
      ? resolveReviewCorrectKey(q.correct_answer, q.options, prev.correct)
      : normalizeLetterKey(prev.correct);
    if (
      prev.is_correct === rq.is_correct &&
      Number(prev.points_earned ?? 0) === pointsEarned &&
      normalizeLetterKey(prev.correct) === correctKey
    ) {
      continue;
    }
    changed = true;
    repaired[idx] = {
      ...prev,
      is_correct: rq.is_correct,
      points_earned: pointsEarned,
      correct: correctKey,
    };
  }

  if (!changed) return { session, gradedDetails: repaired };

  const score = repaired.reduce((sum, d) => sum + Number(d.points_earned ?? 0), 0);
  const hasPendingEssay = repaired.some(
    (d) => d.question_type === "essay" && d.pending_grading
  );
  const updated = await updateSessionGrading(session.id, {
    score,
    graded_details: repaired,
    grading_status: hasPendingEssay ? "pending_manual" : "complete",
  });
  return { session: updated ?? session, gradedDetails: repaired };
}

export const getSessionReview = async (
  sessionId: string,
  studentId: string
): Promise<SessionReviewPayload> => {
  const session = await getSessionById(sessionId);
  if (!session) throw httpError(404, "Không tìm thấy phiên thi");
  if (session.student_id !== studentId) throw httpError(403, "Không có quyền xem bài này");
  if (!sessionAllowsStudentReview(session)) {
    throw httpError(400, "Phiên thi chưa kết thúc — hãy nộp bài trước khi xem kết quả");
  }

  const exam = await getExamById(session.exam_id);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");

  const allQuestions = await getQuestionsByExam(session.exam_id);
  let gradedDetails = parseGradedDetails(session.graded_details);
  const { session: sessionRow, gradedDetails: fixedDetails } = await applyRecomputeIfNeeded(
    session,
    allQuestions,
    gradedDetails
  );
  gradedDetails = fixedDetails;
  const reviewQuestions = await buildReviewQuestionsForSession(
    sessionRow,
    allQuestions,
    gradedDetails
  );
  const repaired = await repairGradedDetailsFromReview(
    sessionRow,
    gradedDetails,
    reviewQuestions,
    allQuestions
  );
  const learningAssessmentSummary = buildLearningAssessmentSummary(
    allQuestions,
    repaired.gradedDetails
  );

  return {
    session: repaired.session,
    exam,
    score: repaired.session.score != null ? Number(repaired.session.score) : null,
    max_points:
      repaired.session.max_points != null ? Number(repaired.session.max_points) : null,
    grading_status: repaired.session.grading_status,
    learning_assessment_summary: learningAssessmentSummary,
    questions: reviewQuestions,
  };
};

export interface GradingViewPayload {
  session: ExamSession;
  exam: ExamDetail;
  student: { full_name: string | null; email: string | null };
  questions: Question[];
  graded_details: GradedDetailRow[];
  version_code: string | null;
  version_id: string | null;
}

export const getSessionGradingView = async (
  sessionId: string,
  actorId: string,
  actorRole: string
): Promise<GradingViewPayload> => {
  const meta = await getSessionWithExam(sessionId);
  if (!meta) throw httpError(404, "Không tìm thấy phiên thi");
  if (meta.status !== "submitted") throw httpError(400, "Chỉ chấm bài đã nộp");

  const canGrade =
    actorRole === "admin" ||
    (actorRole === "teacher" && meta.exam_created_by === actorId);
  if (!canGrade) throw httpError(403, "Không có quyền chấm bài này");

  const exam = await getExamById(meta.exam_id);
  if (!exam) throw httpError(404, "Không tìm thấy đề");

  const allQuestions = await getQuestionsByExam(meta.exam_id);
  let gradedDetails = parseGradedDetails(meta.graded_details);
  const { session: updatedSession, gradedDetails: fixedDetails } =
    await applyRecomputeIfNeeded(meta, allQuestions, gradedDetails);
  let sessionRow = { ...meta, ...updatedSession };
  gradedDetails = fixedDetails;

  const aligned = alignGradedDetailsToExam(gradedDetails, allQuestions);
  if (aligned.changed) {
    gradedDetails = aligned.details;
    const synced = await updateSessionGrading(sessionId, {
      score: aligned.score,
      graded_details: aligned.details,
      grading_status: aligned.gradingStatus,
    });
    if (synced) sessionRow = { ...sessionRow, ...synced };
  }

  const gradedIds = new Set(gradedDetails.map((d) => d.question_id));
  const questions = allQuestions.filter((q) => gradedIds.has(q.id));
  const acc = await pool.query("SELECT full_name, email FROM accounts WHERE id = $1", [
    meta.student_id,
  ]);
  const studentRow = acc.rows[0] ?? {};

  return {
    session: sessionRow,
    exam,
    student: { full_name: studentRow.full_name ?? null, email: studentRow.email ?? null },
    questions,
    graded_details: gradedDetails,
    version_code: (meta as any).version_code ?? null,
    version_id: (meta as any).version_id ?? null,
  };
};

export const gradeEssaySessionService = async (
  sessionId: string,
  actorId: string,
  actorRole: string,
  grades: Record<string, { points_awarded: number; comment?: string }>
): Promise<ExamSession> => {
  const meta = await getSessionWithExam(sessionId);
  if (!meta) throw httpError(404, "Không tìm thấy phiên thi");
  if (meta.status !== "submitted") throw httpError(400, "Phiên không hợp lệ");

  const canGrade =
    actorRole === "admin" ||
    (actorRole === "teacher" && meta.exam_created_by === actorId);
  if (!canGrade) throw httpError(403, "Không có quyền chấm bài này");

  const questions = await getQuestionsByExam(meta.exam_id);
  const qMap = new Map(questions.map((q) => [q.id, q]));
  let details = [...parseGradedDetails(meta.graded_details)];
  if (details.length === 0) throw httpError(400, "Không có dữ liệu chấm");

  const aligned = alignGradedDetailsToExam(details, questions);
  if (aligned.changed) {
    details = aligned.details;
    await updateSessionGrading(sessionId, {
      score: aligned.score,
      graded_details: aligned.details,
      grading_status: aligned.gradingStatus,
    });
  }

  for (const [qid, g] of Object.entries(grades)) {
    const idx = details.findIndex((d) => d.question_id === qid);
    if (idx < 0) throw httpError(400, "Không tìm thấy câu trong bài nộp");
    const detail = details[idx];
    const q = qMap.get(qid);
    if (detail.question_type !== "essay") {
      throw httpError(400, "Câu không phải tự luận hoặc không tồn tại");
    }
    if (typeof g.points_awarded !== "number" || Number.isNaN(g.points_awarded)) {
      throw httpError(400, "points_awarded không hợp lệ");
    }
    const maxPts = q ? Number(q.points) : Number(detail.max_points);
    if (g.points_awarded < 0 || g.points_awarded > maxPts) {
      throw httpError(400, "Điểm vượt quá max cho câu");
    }
    details[idx] = {
      ...details[idx],
      points_earned: g.points_awarded,
      pending_grading: false,
      teacher_comment: g.comment ?? null,
      /** Tự luận chỉ "đúng" khi đạt tối đa điểm câu; điểm một phần không coi là đúng/sai nhị phân. */
      is_correct: g.points_awarded >= maxPts,
    };
  }

  const score = details.reduce(
    (s, d) => s + (d.points_earned != null ? Number(d.points_earned) : 0),
    0
  );
  const pendingEssay = details.some(
    (d) => d.question_type === "essay" && d.pending_grading
  );
  const gradingStatus: GradingStatus = pendingEssay ? "pending_manual" : "complete";
  const wasPendingManual = meta.grading_status === "pending_manual";

  const updated = await updateSessionGrading(sessionId, {
    score,
    graded_details: details,
    grading_status: gradingStatus,
  });
  if (!updated) throw httpError(500, "Cập nhật chấm thất bại");

  if (
    gradingStatus === "complete" &&
    wasPendingManual &&
    updated.student_id
  ) {
    const maxPts =
      updated.max_points != null ? Number(updated.max_points) : score;
    void createNotification(
      updated.student_id,
      "[Kết quả] Đã chấm tự luận xong",
      `Bài thi "${meta.exam_title}" đã được giảng viên chấm xong. Điểm: ${formatScoreScale10Pair(score, maxPts)}. Vào xem kết quả chi tiết.`,
      "success",
      `/result/${meta.exam_id}`
    ).catch(() => { /* non-critical */ });
  }

  return updated;
};

export const getStudentSessions = async (studentId: string): Promise<ExamSession[]> =>
  getSessionsByStudent(studentId);

export const getExamSessions = async (examId: string): Promise<ExamSession[]> =>
  getSessionsByExam(examId);

export function normalizeAutosaveToSubmitAnswers(
  raw: AutosaveAnswers,
  orderedQuestionIds: string[]
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!orderedQuestionIds.length) return out;

  const idSet = new Set(orderedQuestionIds);

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") continue;

    if (idSet.has(key)) {
      out[key] = value;
      continue;
    }

    const match = /^q(\d+)$/.exec(key);
    if (!match) continue;

    const oneBasedIndex = Number(match[1]);
    if (!Number.isInteger(oneBasedIndex) || oneBasedIndex < 1) continue;

    const questionId = orderedQuestionIds[oneBasedIndex - 1];
    if (questionId) {
      out[questionId] = value;
    }
  }

  return out;
}

export interface ForceSubmitSummary {
  exam_id: string;
  active_sessions: number;
  submitted_sessions: number;
  failed_sessions: number;
}

export interface ForceSubmitSessionResult {
  session_id: string;
  exam_id: string;
  student_id: string;
  submitted: boolean;
}

async function forceSubmitOneActiveSession(session: ExamSession): Promise<void> {
  const questions = await getQuestionsByExam(session.exam_id);
  const orderedQuestionIds = questions.map((q) => q.id);
  const snapshot = await getLatestAutosaveSnapshotBySession(session.id);
  const submitAnswers = session.version_id
    ? autosaveToDisplayIndexAnswers(snapshot?.answers ?? {})
    : normalizeAutosaveToSubmitAnswers(snapshot?.answers ?? {}, orderedQuestionIds);

  const autosaveAt = snapshot?.saved_at ? new Date(snapshot.saved_at).getTime() : NaN;
  const autosaveAgeMs = Number.isFinite(autosaveAt) ? Date.now() - autosaveAt : Infinity;
  const disconnectFlag = autosaveAgeMs > DISCONNECT_AUTOSAVE_GAP_MS;

  await submitSessionService(session.id, session.student_id, submitAnswers, {
    allowPastDeadline: true,
    submitSource: "force_submit",
    disconnectFlag,
  });
}

export const forceSubmitSessionService = async (
  sessionId: string,
  actorId: string,
  actorRole: string
): Promise<ForceSubmitSessionResult> => {
  if (!sessionId) throw httpError(400, "session_id là bắt buộc");

  const session = await getSessionById(sessionId);
  if (!session) throw httpError(404, "Phiên thi không tồn tại");

  const allowed = await canManageExamRetake(session.exam_id, actorId, actorRole);
  if (!allowed) throw httpError(403, "Không có quyền ép nộp phiên này");

  if (session.status !== "active") {
    throw httpError(400, "Phiên thi không còn đang làm bài");
  }

  await forceSubmitOneActiveSession(session);

  return {
    session_id: session.id,
    exam_id: session.exam_id,
    student_id: session.student_id,
    submitted: true,
  };
};

export const forceSubmitActiveSessionsByExamService = async (
  examId: string
): Promise<ForceSubmitSummary> => {
  if (!examId) throw httpError(400, "exam_id là bắt buộc");

  const activeSessions = await getActiveSessionsByExam(examId);
  if (activeSessions.length === 0) {
    return {
      exam_id: examId,
      active_sessions: 0,
      submitted_sessions: 0,
      failed_sessions: 0,
    };
  }

  let submittedSessions = 0;
  let failedSessions = 0;

  for (const session of activeSessions) {
    try {
      await forceSubmitOneActiveSession(session);
      submittedSessions += 1;
    } catch (error) {
      failedSessions += 1;
      console.error(
        `[exam] force-submit failed exam=${examId} session=${session.id}`,
        error
      );
    }
  }

  return {
    exam_id: examId,
    active_sessions: activeSessions.length,
    submitted_sessions: submittedSessions,
    failed_sessions: failedSessions,
  };
};

export interface ProctoringEntry {
  session_id: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  status: "active" | "submitted" | "expired";
  started_at: string;
  finished_at: string | null;
  score: number | null;
  max_points: number | null;
  violation_count: number;
  violations: Array<{
    event_type: string;
    client_at: string;
    details: Record<string, unknown> | null;
  }>;
}

export interface ExamProctoringData {
  exam_id: string;
  total_sessions: number;
  active_sessions: number;
  submitted_sessions: number;
  expired_sessions: number;
  sessions: ProctoringEntry[];
}

// ---------------------------------------------------------------------------
// Violation Reporting (P0 Fix: Gửi violation lên server ngay, không chỉ client-side)
// ---------------------------------------------------------------------------

export type ViolationType =
  | "fullscreen_exit"
  | "visibility_hidden"
  | "window_blur"
  | "tab_switch"
  | "devtools_open"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu"
  | "other";

export interface ViolationReport {
  session_id: string;
  student_id: string;
  exam_id: string;
  violation_type: ViolationType;
  reason: string;
  client_at: string;
  auto_submitted: boolean;
}

export interface ReportViolationResult {
  acknowledged: boolean;
  violation_id: string;
  session_status: "active" | "submitted" | "expired" | "violation_locked";
  auto_submit_triggered: boolean;
  message: string;
}

const VIOLATION_TYPES: Set<ViolationType> = new Set([
  "fullscreen_exit",
  "visibility_hidden",
  "window_blur",
  "tab_switch",
  "devtools_open",
  "copy_attempt",
  "paste_attempt",
  "context_menu",
  "other",
]);

export const reportViolationService = async (
  sessionId: string,
  studentId: string,
  payload: {
    violation_type: string;
    reason: string;
    client_at: string;
    auto_submit?: boolean;
  }
): Promise<ReportViolationResult> => {
  if (!sessionId) throw httpError(400, "session_id là bắt buộc");
  if (!payload.violation_type || !VIOLATION_TYPES.has(payload.violation_type as ViolationType)) {
    throw httpError(400, "violation_type không hợp lệ");
  }
  if (!payload.reason?.trim()) throw httpError(400, "reason là bắt buộc");
  if (!payload.client_at) throw httpError(400, "client_at là bắt buộc");

  const session = await getSessionById(sessionId);
  if (!session) throw httpError(404, "Phiên thi không tồn tại");
  if (session.student_id !== studentId) throw httpError(403, "Không có quyền báo cáo vi phạm");

  // Nếu session đã submitted hoặc expired, chỉ ghi log và không auto-submit
  const alreadyFinished = session.status === "submitted" || session.status === "expired";

  // Ghi violation vào bảng exam_integrity_events
  const violationId = `viol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await insertIntegrityEvents(session.exam_id, session.id, studentId, [
    {
      type: payload.violation_type as IntegrityEventType,
      at: payload.client_at,
      details: {
        reason: payload.reason,
        violation_id: violationId,
        auto_submit_requested: payload.auto_submit ?? false,
      },
    },
  ]);

  const strikeCount = await countStrikeEventsBySession(session.id);

  const { emitProctoringIntegrityUpdate } = await import("~/socket/examSocket");
  emitProctoringIntegrityUpdate(session.exam_id, {
    session_id: session.id,
    student_id: studentId,
    accepted: 1,
  });

  let autoSubmitTriggered = false;
  let sessionStatus: ReportViolationResult["session_status"] = session.status as ReportViolationResult["session_status"];

  const requestAutoSubmit =
    !alreadyFinished &&
    (payload.auto_submit === true || shouldAutoSubmitByViolationCount(strikeCount));

  if (requestAutoSubmit) {
    try {
      const snapshot = await getLatestAutosaveSnapshotBySession(session.id);
      const submitAnswers = autosaveToDisplayIndexAnswers(snapshot?.answers ?? {});
      await submitSessionService(session.id, studentId, submitAnswers, {
        allowPastDeadline: true,
        submitSource: "violation_auto",
      });
      autoSubmitTriggered = true;
      sessionStatus = "submitted";
    } catch (submitError) {
      console.error(`[violation] auto-submit failed session=${sessionId}`, submitError);
      sessionStatus = "violation_locked";
    }
  } else if (!alreadyFinished) {
    sessionStatus = "violation_locked";
  }

  return {
    acknowledged: true,
    violation_id: violationId,
    session_status: sessionStatus,
    auto_submit_triggered: autoSubmitTriggered,
    message: autoSubmitTriggered
      ? "Vi phạm đã được ghi nhận. Bài thi đã được tự động nộp."
      : alreadyFinished
        ? "Vi phạm đã được ghi nhận. Bài thi đã nộp trước đó."
        : "Vi phạm đã được ghi nhận. Bài thi đã bị khóa.",
  };
};

export const getExamProctoringData = async (examId: string): Promise<ExamProctoringData> => {
  if (!examId) throw httpError(400, "exam_id là bắt buộc");

  const sessions = await getSessionsByExamWithStudent(examId);
  const events = await getIntegrityEventsByExam(examId);

  const eventsBySession = new Map<string, typeof events>();
  for (const ev of events) {
    const list = eventsBySession.get(ev.session_id) ?? [];
    list.push(ev);
    eventsBySession.set(ev.session_id, list);
  }

  const strikeTypeSet = new Set<string>(STRIKE_EVENT_TYPES);

  const entries: ProctoringEntry[] = await Promise.all(
    sessions.map(async (s) => {
      const sessEvents = eventsBySession.get(s.id) ?? [];
      const strikeCount = await countStrikeEventsBySession(s.id);
      const strikeEvents = sessEvents.filter((ev) => strikeTypeSet.has(ev.event_type));
      return {
        session_id: s.id,
        student_id: s.student_id,
        student_name: s.student_name,
        student_email: s.student_email,
        status: s.status,
        started_at: s.started_at,
        finished_at: s.submitted_at,
        score: s.score,
        max_points: s.max_points,
        violation_count: strikeCount,
        violations: strikeEvents.map((ev) => ({
          event_type: ev.event_type,
          client_at: ev.client_at,
          details: ev.details,
        })),
      };
    })
  );

  return {
    exam_id: examId,
    total_sessions: sessions.length,
    active_sessions: sessions.filter((s) => s.status === "active").length,
    submitted_sessions: sessions.filter((s) => s.status === "submitted").length,
    expired_sessions: sessions.filter((s) => s.status === "expired").length,
    sessions: entries,
  };
};
