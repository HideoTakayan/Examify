import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getExamListController,
  getExamController,
  createExamController,
  updateExamController,
  deleteExamController,
  getQuestionsController,
  addQuestionController,
  updateQuestionController,
  deleteQuestionController,
  startSessionController,
  submitSessionController,
  getMySessionsController,
  getExamSessionsController,
  forceSubmitExamSessionsController,
  forceSubmitSessionController,
  startExamRuntimeController,
  getMySubmissionController,
  getSessionGradingController,
  getSessionReviewController,
  gradeSessionController,
  getExamProctoringController,
  postIntegrityEventsController,
  postAutosaveController,
  downloadWordImportTemplateController,
  previewWordImportController,
  commitWordImportController,
  aiRecomposeExamController,
  uploadExamMediaController,
  getIntegrityEventsController,
  getProctorPresenceController,
  getProctorLogsController,
  reportViolationController,
} from "~/controllers/exam.controller";
import {
  grantRetakeController,
  revokeRetakeController,
  listExamRetakeGrantsController,
  getMyRetakeGrantsController,
} from "~/controllers/examRetake.controller";

const examRouter = Router();
const wordImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 2 },
});
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

examRouter.use(authMiddleware);

examRouter.get("/sessions/me", roleMiddleware(["admin", "teacher", "student"]), getMySessionsController);
examRouter.get("/retake-grants/me", roleMiddleware(["student"]), getMyRetakeGrantsController);
examRouter.post("/sessions/:sessionId/submit", roleMiddleware(["student"]), submitSessionController);
// P0 Fix: Report violation immediately to server (lock + auto-submit)
examRouter.post(
  "/sessions/:sessionId/report-violation",
  roleMiddleware(["student"]),
  reportViolationController
);
examRouter.post(
  "/sessions/:sessionId/force-submit",
  roleMiddleware(["admin", "teacher"]),
  forceSubmitSessionController
);
examRouter.get(
  "/sessions/:sessionId/grading",
  roleMiddleware(["admin", "teacher"]),
  getSessionGradingController
);
examRouter.patch(
  "/sessions/:sessionId/grade",
  roleMiddleware(["admin", "teacher"]),
  gradeSessionController
);
examRouter.get(
  "/sessions/:sessionId/review",
  roleMiddleware(["student"]),
  getSessionReviewController
);

examRouter.post(
  "/integrity-events",
  roleMiddleware(["student"]),
  postIntegrityEventsController
);

examRouter.post(
  "/autosave",
  roleMiddleware(["student"]),
  postAutosaveController
);

examRouter.get("/", roleMiddleware(["admin", "teacher", "student"]), getExamListController);
examRouter.post("/", roleMiddleware(["admin", "teacher"]), createExamController);
examRouter.get(
  "/import-word/template",
  roleMiddleware(["admin", "teacher"]),
  downloadWordImportTemplateController
);
examRouter.post(
  "/import-word/preview",
  roleMiddleware(["admin", "teacher"]),
  wordImportUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "mediaArchive", maxCount: 1 },
  ]),
  previewWordImportController
);
examRouter.post(
  "/import-word/commit",
  roleMiddleware(["admin", "teacher"]),
  commitWordImportController
);
examRouter.post(
  "/import-word/ai-recompose",
  roleMiddleware(["admin", "teacher"]),
  wordImportUpload.fields([
    { name: "file", maxCount: 1 },
    { name: "mediaArchive", maxCount: 1 },
  ]),
  aiRecomposeExamController
);
examRouter.post(
  "/upload-media",
  roleMiddleware(["admin", "teacher"]),
  mediaUpload.single("file"),
  uploadExamMediaController
);
examRouter.get("/:id", roleMiddleware(["admin", "teacher", "student"]), getExamController);
examRouter.patch("/:id", roleMiddleware(["admin", "teacher"]), updateExamController);
examRouter.delete("/:id", roleMiddleware(["admin", "teacher"]), deleteExamController);

examRouter.get("/:examId/questions", roleMiddleware(["admin", "teacher", "student"]), getQuestionsController);
examRouter.post("/:examId/questions", roleMiddleware(["admin", "teacher"]), addQuestionController);
examRouter.patch(
  "/:examId/questions/:questionId",
  roleMiddleware(["admin", "teacher"]),
  updateQuestionController
);
examRouter.delete("/:examId/questions/:questionId", roleMiddleware(["admin", "teacher"]), deleteQuestionController);

examRouter.post("/:examId/sessions", roleMiddleware(["student"]), startSessionController);
examRouter.get("/:examId/sessions", roleMiddleware(["admin", "teacher"]), getExamSessionsController);
examRouter.get(
  "/:examId/retake-grants",
  roleMiddleware(["admin", "teacher"]),
  listExamRetakeGrantsController
);
examRouter.post(
  "/:examId/retake-grants",
  roleMiddleware(["admin", "teacher"]),
  grantRetakeController
);
examRouter.delete(
  "/:examId/retake-grants/:grantId",
  roleMiddleware(["admin", "teacher"]),
  revokeRetakeController
);
examRouter.get(
  "/:examId/proctoring",
  roleMiddleware(["admin", "teacher"]),
  getExamProctoringController
);
examRouter.post(
  "/:examId/start-runtime",
  roleMiddleware(["admin", "teacher"]),
  startExamRuntimeController
);
examRouter.post(
  "/:examId/force-submit",
  roleMiddleware(["admin", "teacher"]),
  forceSubmitExamSessionsController
);
examRouter.get("/:examId/my-submission", roleMiddleware(["student"]), getMySubmissionController);

// Task 2: Integrity events + presence endpoints for teacher/admin
examRouter.get(
  "/:examId/integrity-events",
  roleMiddleware(["admin", "teacher"]),
  getIntegrityEventsController
);
examRouter.get(
  "/:examId/presence",
  roleMiddleware(["admin", "teacher"]),
  getProctorPresenceController
);
examRouter.get(
  "/:examId/proctor-logs",
  roleMiddleware(["admin", "teacher"]),
  getProctorLogsController
);

export default examRouter;
