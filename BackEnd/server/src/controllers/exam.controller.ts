import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { tryStartScheduledExamById } from "~/jobs/examScheduledRuntime.job";
import {
  listExamsPaginated,
  getExam,
  createExamService,
  updateExamService,
  deleteExamService,
  getQuestionsForStudent,
  getQuestionsForTeacher,
  addQuestion,
  updateQuestionInExam,
  removeQuestion,
  startSessionWithMeta,
  submitSessionService,
  getStudentSessions,
  getExamSessions,
  getMySubmissionForExam,
  getSessionGradingView,
  gradeEssaySessionService,
  forceSubmitActiveSessionsByExamService,
  forceSubmitSessionService,
  getExamProctoringData,
  normalizeIntegrityEvents,
  persistIntegrityEventsService,
  persistAutosaveSnapshotService,
  createExamWithQuestionsService,
  getSessionReview,
  reportViolationService,
} from "~/services/exam.service";
import { parseExamImportDocx, aiRecomposeExam } from "~/services/examImport.service";
import { getIntegrityEventsByExam } from "~/models/examIntegrity.model";
import { getActivePresenceByExam, queryProctorLogsByExamPaginated } from "~/models/examProctor.model";
import { querySessionsByExamPaginated } from "~/models/examsession.model";
import { enrichSessionsForTeacherView } from "~/services/examSessionDisplay.service";
import { saveExamRuntimeEnd } from "~/models/examRuntimeState.model";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";
import {
  EXAM_MEDIA_FOLDER,
  EXAM_PREVIEW_MEDIA_FOLDER,
  uploadMediaBuffer,
} from "~/services/cloudinary.service";
import { emitForceSubmitNotification, startExamRuntimeFromServer, emitViolationConfirmed } from "~/socket/examSocket";
import { auditGradeSession, auditForceSubmit } from "~/services/auditHelpers";
import type { QuestionType } from "~/models/question.model";
import { getProgramSubjectIds, resolveProgramForPickerQuery } from "~/services/subjectCatalog.service";

export const getExamListController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const class_id = req.query.class_id as string | undefined;
    let admin_class_id = req.query.admin_class_id as string | undefined;
    const search = req.query.search as string | undefined;
    const user = (req as { user?: { userId?: string; role?: string } }).user;

    let subject_ids: string[] | undefined;

    if (user?.role === "teacher" || user?.role === "student") {
      const ctx = await resolveProgramForPickerQuery({
        userId: user.userId,
        userRole: user.role,
      });
      subject_ids = await getProgramSubjectIds(ctx.programId);
      // Removed forced admin_class_id filtering here because it hides exams bound only to class_id
    } else {
      const programScope = String(req.query.program_scope ?? "").trim().toLowerCase();
      if (programScope === "cntt") {
        subject_ids = await getProgramSubjectIds();
      }
    }

    const result = await listExamsPaginated(
      { class_id, admin_class_id, search, subject_ids },
      limit,
      offset
    );
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
};

export const getExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await tryStartScheduledExamById(req.params.id);
    const exam = await getExam(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    res.json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

export const createExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, admin_class_id, subject_id, class_id, duration_min, description, closes_at, opens_at, ends_at, num_versions } =
      req.body;
    if (!title || !admin_class_id || !subject_id || !duration_min) {
      return res.status(400).json({
        success: false,
        message: "title/admin_class_id/subject_id/duration_min là bắt buộc",
      });
    }
    const user = (req as any).user;
    const exam = await createExamService(
      title,
      user.userId,
      Number(duration_min),
      { admin_class_id, subject_id, class_id },
      user.role,
      description,
      closes_at,
      num_versions ? Number(num_versions) : 2,
      opens_at,
      ends_at
    );
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

const WORD_IMPORT_SAMPLE_PACK_PATH = path.join(
  process.cwd(),
  "..",
  "exam_import_sample_pack.zip"
);

function getMultipartFile(req: Request, fieldName: string): Express.Multer.File | null {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return files?.[fieldName]?.[0] ?? null;
}

function isFileExtension(file: Express.Multer.File, expectedExtension: string): boolean {
  return file.originalname.toLowerCase().endsWith(expectedExtension.toLowerCase());
}

export const downloadWordImportTemplateController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!fs.existsSync(WORD_IMPORT_SAMPLE_PACK_PATH)) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bộ file mẫu import" });
    }
    res.download(WORD_IMPORT_SAMPLE_PACK_PATH, "exam_import_sample_pack.zip");
  } catch (err) {
    next(err);
  }
};

export const previewWordImportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = getMultipartFile(req, "file");
    const mediaArchive = getMultipartFile(req, "mediaArchive");
    if (!file) {
      return res.status(400).json({ success: false, message: "file .docx là bắt buộc" });
    }
    if (!isFileExtension(file, ".docx")) {
      return res.status(400).json({ success: false, message: "file phải là .docx hợp lệ" });
    }
    if (mediaArchive && !isFileExtension(mediaArchive, ".zip")) {
      return res.status(400).json({ success: false, message: "mediaArchive phải là file .zip" });
    }
    const preview = await parseExamImportDocx(file.buffer, mediaArchive?.buffer);
    res.json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
};

export const commitWordImportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { title, admin_class_id, subject_id, class_id, duration_min, description, closes_at, opens_at, ends_at, num_versions, questions } =
      req.body;
    const data = await createExamWithQuestionsService({
      title,
      admin_class_id,
      subject_id,
      class_id,
      duration_min: Number(duration_min),
      description,
      closes_at,
      opens_at,
      ends_at,
      num_versions: num_versions ? Number(num_versions) : 2,
      questions,
      created_by: user.userId,
      role: user.role,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const aiRecomposeExamController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = getMultipartFile(req, "file");
    const mediaArchive = getMultipartFile(req, "mediaArchive");
    if (!file) {
      return res.status(400).json({ success: false, message: "file .docx là bắt buộc" });
    }
    if (!isFileExtension(file, ".docx")) {
      return res.status(400).json({ success: false, message: "file phải là .docx hợp lệ" });
    }
    if (mediaArchive && !isFileExtension(mediaArchive, ".zip")) {
      return res.status(400).json({ success: false, message: "mediaArchive phải là file .zip" });
    }
    const examInfo = req.body.examInfo ? JSON.parse(req.body.examInfo) : {};
    const result = await aiRecomposeExam(file.buffer, examInfo, mediaArchive?.buffer);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("aiRecomposeExamController error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Lỗi khi xử lý AI" });
  }
};

export const uploadExamMediaController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    const isPreviewTemp = req.body?.scope === "preview-temp";
    if (!file) {
      return res.status(400).json({ success: false, message: "file media là bắt buộc" });
    }

    const uploaded = await uploadMediaBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      folder: isPreviewTemp ? EXAM_PREVIEW_MEDIA_FOLDER : EXAM_MEDIA_FOLDER,
      tags: isPreviewTemp ? ["preview-temp"] : ["exam-media"],
    });

    res.json({
      success: true,
      data: {
        url: uploaded.secure_url || uploaded.url,
        public_id: uploaded.public_id,
        resource_type: uploaded.resource_type,
        bytes: uploaded.bytes,
        format: uploaded.format ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exam = await updateExamService(req.params.id, req.body);
    if (!exam) return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    res.json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

export const deleteExamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await deleteExamService(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    res.json({ success: true, message: "Đã xóa bài thi" });
  } catch (err) {
    next(err);
  }
};

export const getQuestionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";
    const data = isTeacherOrAdmin
      ? await getQuestionsForTeacher(req.params.examId)
      : await getQuestionsForStudent(req.params.examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const addQuestionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      content,
      options,
      correct_answer,
      points,
      question_type,
      media_url,
      version_index,
      question_bank_id,
      difficulty,
      chapter,
      chapter_label,
      answer_hint,
    } = req.body;
    if (!content || points === undefined || points === null) {
      return res.status(400).json({ success: false, message: "content và points là bắt buộc" });
    }
    const qt = (question_type || "mcq") as QuestionType;
    if (qt !== "mcq" && qt !== "essay") {
      return res.status(400).json({ success: false, message: "question_type phải là mcq hoặc essay" });
    }
    const q = await addQuestion(
      req.params.examId,
      content,
      Number(points),
      qt,
      options ?? null,
      correct_answer ?? null,
      media_url ?? null,
      undefined,
      version_index != null ? Number(version_index) : 0,
      typeof question_bank_id === "string" ? question_bank_id : null,
      difficulty,
      chapter != null ? Number(chapter) : null,
      typeof chapter_label === "string" ? chapter_label.trim() || null : null,
      typeof answer_hint === "string" ? answer_hint.trim() || null : null
    );
    res.status(201).json({ success: true, data: q });
  } catch (err) {
    next(err);
  }
};

export const updateQuestionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      content,
      options,
      correct_answer,
      points,
      question_type,
      media_url,
      display_order,
      difficulty,
      chapter,
      chapter_label,
      answer_hint,
    } = req.body;
    if (!content || points === undefined || points === null || display_order === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "content, points và display_order là bắt buộc" });
    }
    const qt = (question_type || "mcq") as QuestionType;
    if (qt !== "mcq" && qt !== "essay") {
      return res.status(400).json({ success: false, message: "question_type phải là mcq hoặc essay" });
    }
    const q = await updateQuestionInExam(req.params.examId, req.params.questionId, {
      content,
      points: Number(points),
      question_type: qt,
      options: options ?? null,
      correct_answer: correct_answer ?? null,
      media_url: media_url ?? null,
      display_order: Number(display_order),
      difficulty,
      chapter: chapter != null ? Number(chapter) : undefined,
      chapter_label: typeof chapter_label === "string" ? chapter_label.trim() || null : undefined,
      answer_hint: typeof answer_hint === "string" ? answer_hint.trim() || null : undefined,
    });
    res.json({ success: true, data: q });
  } catch (err) {
    next(err);
  }
};

export const deleteQuestionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await removeQuestion(req.params.questionId);
    if (!ok) return res.status(404).json({ success: false, message: "Không tìm thấy câu hỏi" });
    res.json({ success: true, message: "Đã xóa câu hỏi" });
  } catch (err) {
    next(err);
  }
};

export const startSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    await tryStartScheduledExamById(req.params.examId);
    const data = await startSessionWithMeta(req.params.examId, user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const submitSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { answers } = req.body;
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "answers là bắt buộc (object)" });
    }
    const user = (req as any).user;
    const result = await submitSessionService(req.params.sessionId, user.userId, answers);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMySessionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getStudentSessions(user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExamSessionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const result = await querySessionsByExamPaginated(req.params.examId, limit, offset);
    const items = await enrichSessionsForTeacherView(result.items, req.params.examId);
    res.json({
      success: true,
      data: buildPaginatedList(items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
};

export const forceSubmitExamSessionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const examId = req.params.examId;
    const data = await forceSubmitActiveSessionsByExamService(examId);
    // Khi GV "force-submit" thì cũng cần tắt runtime để FE reload sẽ không còn hiển thị exam đang chạy.
    await saveExamRuntimeEnd(examId);
    emitForceSubmitNotification(examId, data);
    await auditForceSubmit(user.userId, user.role, examId, data.active_sessions, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const forceSubmitSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { sessionId } = req.params;
    const data = await forceSubmitSessionService(sessionId, user.userId, user.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const startExamRuntimeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await startExamRuntimeFromServer(req.params.examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMySubmissionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getMySubmissionForExam(req.params.examId, user.userId);
    if (!data) return res.status(404).json({ success: false, message: "Chưa có bài nộp" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSessionGradingController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getSessionGradingView(req.params.sessionId, user.userId, user.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSessionReviewController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await getSessionReview(req.params.sessionId, user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const gradeSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grades } = req.body;
    if (!grades || typeof grades !== "object") {
      return res.status(400).json({ success: false, message: "grades là object bắt buộc" });
    }
    const user = (req as any).user;
    const session = await gradeEssaySessionService(req.params.sessionId, user.userId, user.role, grades);
    await auditGradeSession(user.userId, user.role, req.params.sessionId, req);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

export const getExamProctoringController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getExamProctoringData(req.params.examId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const postIntegrityEventsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { exam_id, events } = req.body;

    if (!exam_id) {
      return res.status(400).json({ success: false, message: "exam_id là bắt buộc" });
    }

    const normalized = normalizeIntegrityEvents(events);
    const data = await persistIntegrityEventsService(String(exam_id), user.userId, normalized);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const postAutosaveController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { exam_id, saved_at, answers } = req.body;

    if (!exam_id || !saved_at || answers === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "exam_id/saved_at/answers là bắt buộc" });
    }

    const data = await persistAutosaveSnapshotService({
      examId: String(exam_id),
      studentId: user.userId,
      savedAt: String(saved_at),
      answers,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ---- Task 2: Proctoring endpoints for teacher/admin ----

export const getIntegrityEventsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const events = await getIntegrityEventsByExam(req.params.examId);
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};

export const getProctorPresenceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const presence = await getActivePresenceByExam(req.params.examId);
    res.json({ success: true, data: presence });
  } catch (err) {
    next(err);
  }
};

export const getProctorLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>, {
      defaultLimit: 50,
      maxLimit: 500,
    });
    const result = await queryProctorLogsByExamPaginated(req.params.examId, limit, offset);
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
};

// ---- P0 Fix: Report violation immediately to server ----
export const reportViolationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { sessionId } = req.params;
    const { violation_type, reason, client_at, auto_submit } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "session_id là bắt buộc" });
    }
    if (!violation_type) {
      return res.status(400).json({ success: false, message: "violation_type là bắt buộc" });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: "reason là bắt buộc" });
    }

    const data = await reportViolationService(sessionId, user.userId, {
      violation_type,
      reason,
      client_at: client_at || new Date().toISOString(),
      auto_submit: auto_submit === true,
    });

    // Emit socket event to notify teacher/proctors about the violation
    emitViolationConfirmed(sessionId, data);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
