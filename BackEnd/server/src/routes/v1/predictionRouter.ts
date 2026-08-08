import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  deletePredictionCacheByUserId,
  getCachedPredictionByUserId,
} from "~/models/studentPredictionCache.model";
import { recomputePredictionsForAllStudents } from "~/services/predictionBatch.service";
import { loadStudentCompletedExams } from "~/services/predictionData.service";
import {
  generatePredictionForStudent,
  getStudentEligibility,
} from "~/services/predictionStudent.service";
import {
  PredictionAiTimeoutError,
  getPredictionAiQueueStats,
} from "~/utils/predictionAiQueue";

const router = Router();

/** Lịch sử điểm theo môn (một dòng / môn, lần thi mới nhất) — đồng bộ với logic dự báo. */
router.get(
  "/me/history",
  authMiddleware,
  roleMiddleware(["student"]),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.userId as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const rows = await loadStudentCompletedExams(userId);
      return res.json({
        success: true,
        data: rows.map((r) => ({
          subject_id: r.subject_id,
          subject: r.subject,
          semester: r.semester,
          score: r.score,
          grade: r.grade,
          submitted_at:
            r.session.submitted_at ?? r.session.started_at ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/** Kiểm tra đủ dữ kiện dự đoán một môn (query: target_subject = tên môn). */
router.get(
  "/me/eligibility",
  authMiddleware,
  roleMiddleware(["student"]),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.userId as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const targetId = String(
        req.query.target_subject_id ?? req.query.target_subject ?? ""
      ).trim();
      if (!targetId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu target_subject_id (UUID môn học)",
        });
      }
      const data = await getStudentEligibility(userId, targetId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/** Sinh viên rời trang đánh giá — xóa cache cũ (mỗi lần vào trang là phiên mới). */
router.delete("/me", authMiddleware, roleMiddleware(["student"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await deletePredictionCacheByUserId(userId);
    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

/** @deprecated Sinh viên không còn đọc cache khi vào trang; admin batch vẫn ghi cache. */
router.get("/me", authMiddleware, roleMiddleware(["student", "admin"]), async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await getCachedPredictionByUserId(userId);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * Sinh viên tự yêu cầu dự đoán AI (1 SV / 1 request).
 * Toàn server tối đa 5 gọi MiniMax song song; quá 120s → 408, nhờ thử lại.
 */
router.post(
  "/me/generate",
  authMiddleware,
  roleMiddleware(["student"]),
  async (req, res, next) => {
    try {
      const user = (req as any).user as { userId?: string; fullName?: string } | undefined;
      if (!user?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const targetSubjectId = String(
        req.body?.target_subject_id ?? req.body?.target_subject ?? ""
      ).trim();
      const data = await generatePredictionForStudent(
        user.userId,
        user.fullName ?? null,
        targetSubjectId
      );
      return res.json({ success: true, data });
    } catch (err: unknown) {
      if (err instanceof PredictionAiTimeoutError) {
        return res.status(408).json({ success: false, message: err.message, code: "prediction_timeout" });
      }
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : "Lỗi đánh giá học lực";
      if (message.includes("MINIMAX_API_KEY")) {
        return res.status(503).json({ success: false, message: "Dịch vụ AI đánh giá học lực chưa được cấu hình" });
      }
      if (status === 400) {
        return res.status(400).json({ success: false, message });
      }
      next(err);
    }
  }
);

/** Admin: tính lại dự đoán MiniMax cho mọi sinh viên có đủ dữ liệu, ghi cache (tuỳ chọn). */
router.post(
  "/admin/recompute-all",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res, next) => {
    try {
      const summary = await recomputePredictionsForAllStudents();
      return res.json({ success: true, data: summary });
    } catch (err: any) {
      if (err.message?.includes("MINIMAX_API_KEY")) {
        return res.status(503).json({ success: false, message: "Dịch vụ AI dự đoán chưa được cấu hình" });
      }
      next(err);
    }
  }
);

router.get("/queue-stats", authMiddleware, roleMiddleware(["admin"]), (_req, res) => {
  res.json({ success: true, data: getPredictionAiQueueStats() });
});

export default router;
