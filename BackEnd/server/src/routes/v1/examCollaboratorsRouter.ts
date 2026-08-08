import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  addCollaborator,
  getCollaborators,
  removeCollaborator,
  canAccessExam,
  isOwner,
} from "~/models/examCollaborators.model";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// GET /v1/exam-collaborators/:examId — list collaborators
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { examId } = req.params as { examId: string };
    const canAccess = await canAccessExam(examId, userId);
    if (!canAccess) {
      res.status(403).json({ success: false, error: "Không có quyền truy cập đề thi này" });
      return;
    }
    const collaborators = await getCollaborators(examId);
    res.json({ success: true, data: collaborators });
  } catch (err) {
    next(err);
  }
});

// POST /v1/exam-collaborators/:examId — add collaborator (owner only)
router.post("/", roleMiddleware(["admin", "teacher"]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { examId } = req.params as { examId: string };
    const { teacher_id, role } = req.body;

    if (!teacher_id) {
      res.status(400).json({ success: false, error: "teacher_id là bắt buộc" });
      return;
    }

    const amOwner = await isOwner(examId, userId);
    if (!amOwner) {
      res.status(403).json({ success: false, error: "Chỉ chủ sở hữu đề thi mới có thể thêm cộng tác viên" });
      return;
    }

    const collaborator = await addCollaborator(
      examId,
      teacher_id,
      role === "owner" ? "owner" : "grader"
    );
    res.status(201).json({ success: true, data: collaborator });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/exam-collaborators/:examId/:teacherId — remove collaborator (owner only)
router.delete("/:teacherId", roleMiddleware(["admin", "teacher"]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { examId, teacherId } = req.params as { examId: string; teacherId: string };

    const amOwner = await isOwner(examId, userId);
    if (!amOwner) {
      res.status(403).json({ success: false, error: "Chỉ chủ sở hữu đề thi mới có thể xóa cộng tác viên" });
      return;
    }

    const removed = await removeCollaborator(examId, teacherId);
    if (!removed) {
      res.status(404).json({ success: false, error: "Không tìm thấy cộng tác viên" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;