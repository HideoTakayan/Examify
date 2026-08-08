/**
 * Router cho kiến trúc 3 tầng dự đoán điểm.
 *
 * Tầng 1 (predict, evaluate-summary input) MIỄN PHÍ → mở cho student + teacher + admin.
 * Tầng 2 (gọi AI) TỐN TOKEN → đăng nhập là đủ; có thể siết quyền nếu cần.
 * Model info chỉ cho teacher/admin.
 */

import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  predictGradeController,
  evaluateStudentController,
  fullReportController,
  modelInfoController,
} from "~/controllers/gradePredictor.controller";

const router = Router();

router.post("/predict", authMiddleware, predictGradeController);
router.post("/evaluate", authMiddleware, evaluateStudentController);
router.post("/full-report", authMiddleware, fullReportController);
router.get(
  "/model-info",
  authMiddleware,
  roleMiddleware(["teacher", "admin"]),
  modelInfoController
);

export default router;
