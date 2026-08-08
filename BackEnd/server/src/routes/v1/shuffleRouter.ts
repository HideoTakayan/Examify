import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  shuffleQuestionsByChapter,
  getExamChapterMap,
  getChaptersUsedByExam,
} from "~/models/examShuffle.model";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "teacher"]));

// POST /v1/shuffle/exams/:examId — shuffle questions within chapters
router.post("/exams/:examId", async (req, res, next) => {
  try {
    const updates = await shuffleQuestionsByChapter(req.params.examId);
    res.json({
      success: true,
      data: {
        updated_count: updates.length,
        updates,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/shuffle/exams/:examId/chapters — get chapters used in exam
router.get("/exams/:examId/chapters", async (req, res, next) => {
  try {
    const chapters = await getChaptersUsedByExam(req.params.examId);
    const map = await getExamChapterMap(req.params.examId);
    res.json({
      success: true,
      data: {
        chapters,
        question_chapter_map: Object.fromEntries(map.entries()),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;