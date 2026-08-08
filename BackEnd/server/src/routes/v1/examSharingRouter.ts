import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  shareExamWith,
  getExamShares,
  removeExamShare,
  getSharedExams,
  canAccessExam,
  assignGrader,
  getGradingAssignments,
  updateGradingStatus,
  getGradingAssignmentsByExam,
  getMyGradingAssignments,
  getPendingGradingCount,
} from "~/models/examSharing.model";

const router = Router();

router.use(authMiddleware);

// --- Exam Sharing ---

// GET /v1/exam-sharing/me — get my shared exams
router.get("/me", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const shares = await getSharedExams(userId);
    res.json({ success: true, data: shares });
  } catch (err) {
    next(err);
  }
});

// GET /v1/exam-sharing/exams/:examId/shares
router.get("/exams/:examId/shares", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const canAccess = await canAccessExam(req.params.examId, userId);
    if (!canAccess) {
      res.status(403).json({ success: false, error: "Không có quyền truy cập đề thi này" });
      return;
    }
    const shares = await getExamShares(req.params.examId);
    res.json({ success: true, data: shares });
  } catch (err) {
    next(err);
  }
});

// POST /v1/exam-sharing/exams/:examId/share
router.post("/exams/:examId/share", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { shared_with, role } = req.body;
    if (!shared_with || !role) {
      res.status(400).json({ success: false, error: "shared_with và role là bắt buộc" });
      return;
    }
    const share = await shareExamWith(req.params.examId, shared_with, role, userId);
    res.status(201).json({ success: true, data: share });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/exam-sharing/exams/:examId/shares/:userId
router.delete("/exams/:examId/shares/:userId", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const deleted = await removeExamShare(req.params.examId, req.params.userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy chia sẻ" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Grading Assignments ---

// GET /v1/exam-sharing/grading/me — my grading assignments
router.get("/grading/me", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const assignments = await getMyGradingAssignments(userId);
    res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
});

// GET /v1/exam-sharing/grading/pending/count
router.get("/grading/pending/count", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const count = await getPendingGradingCount(userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

// GET /v1/exam-sharing/grading/exam/:examId
router.get("/grading/exam/:examId", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const assignments = await getGradingAssignmentsByExam(req.params.examId);
    res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
});

// POST /v1/exam-sharing/grading/assign
router.post("/grading/assign", roleMiddleware(["admin"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { exam_session_id, exam_id, teacher_id } = req.body;
    if (!exam_session_id || !exam_id || !teacher_id) {
      res.status(400).json({ success: false, error: "exam_session_id, exam_id, teacher_id là bắt buộc" });
      return;
    }
    const assignment = await assignGrader(exam_session_id, exam_id, teacher_id, userId);
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/exam-sharing/grading/:assignmentId
router.patch("/grading/:assignmentId", roleMiddleware(["admin", "teacher"]), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: "status là bắt buộc" });
      return;
    }
    const assignment = await updateGradingStatus(req.params.assignmentId, status, notes);
    if (!assignment) {
      res.status(404).json({ success: false, error: "Không tìm thấy phân công chấm" });
      return;
    }
    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
});

export default router;