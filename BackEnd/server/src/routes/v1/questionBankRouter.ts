import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createQuestionBankItem,
  getQuestionBankItems,
  getQuestionBankById,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  importToExam,
  importRandomToExam,
} from "~/models/questionBank.model";
import { assertTeacherCanManageExam } from "~/services/exam.service";
import type { QuestionBankFilter } from "~/models/questionBank.model";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";

const router = Router();

// All question bank routes require teacher or admin
router.use(authMiddleware);
router.use(roleMiddleware(["admin", "teacher"]));

// GET /v1/question-bank — list with filter
router.get("/", async (req, res, next) => {
  try {
    const filter: QuestionBankFilter = {
      subject_id: req.query.subject_id as string | undefined,
      difficulty: req.query.difficulty as QuestionBankFilter["difficulty"],
      chapter: req.query.chapter ? Number(req.query.chapter) : undefined,
      question_type: req.query.question_type as QuestionBankFilter["question_type"],
      search: req.query.search as string | undefined,
      created_by: req.query.created_by as string | undefined,
    };

    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>, {
      maxLimit: 100,
    });

    const result = await getQuestionBankItems(filter, limit, offset);
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/question-bank/:id
router.get("/:id", async (req, res, next) => {
  try {
    const item = await getQuestionBankById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: "Không tìm thấy câu hỏi" });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// POST /v1/question-bank — create
router.post("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const item = await createQuestionBankItem(userId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/question-bank/:id — update
router.patch("/:id", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const existing = await getQuestionBankById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: "Không tìm thấy câu hỏi" });
      return;
    }
    if (user.role !== "admin" && existing.created_by !== user.userId) {
      res.status(403).json({ success: false, error: "Không có quyền sửa câu hỏi này" });
      return;
    }

    const item = await updateQuestionBankItem(req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/question-bank/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const existing = await getQuestionBankById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, error: "Không tìm thấy câu hỏi" });
      return;
    }
    if (user.role !== "admin" && existing.created_by !== user.userId) {
      res.status(403).json({ success: false, error: "Không có quyền xóa câu hỏi này" });
      return;
    }

    await deleteQuestionBankItem(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /v1/question-bank/:id/import/:examId — import to exam
router.post("/:id/import/:examId", async (req, res, next) => {
  try {
    const user = (req as any).user;
    await assertTeacherCanManageExam(req.params.examId, user.userId, user.role);

    const versionIndex =
      req.body?.version_index != null ? Number(req.body.version_index) : undefined;
    const result = await importToExam(req.params.id, req.params.examId, {
      versionIndex,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === "Question bank item not found") {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

// POST /v1/question-bank/random-import/:examId — import random questions to exam
router.post("/random-import/:examId", async (req, res, next) => {
  try {
    const { num_questions, subject_id, version_index } = req.body;
    if (!num_questions || typeof num_questions !== "number" || num_questions <= 0) {
      return res.status(400).json({ success: false, error: "num_questions là bắt buộc và phải lớn hơn 0" });
    }

    const versionIndex = version_index != null ? Number(version_index) : undefined;
    
    const user = (req as any).user;
    await assertTeacherCanManageExam(req.params.examId, user.userId, user.role);

    const result = await importRandomToExam(req.params.examId, num_questions, {
      subjectId: subject_id,
      versionIndex,
    });
    
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;