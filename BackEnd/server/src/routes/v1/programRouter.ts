import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createProgram,
  deleteProgram,
  getAllPrograms,
  getProgramById,
  updateProgram,
  getProgramTeachers,
  setProgramTeachers,
  type CreateProgramInput,
  type UpdateProgramInput,
} from "~/models/program.model";
import pool from "~/config/db";
import {
  assignProgramGroupsController,
  unassignProgramGroupController,
  assignProgramSubjectsController,
  unassignProgramSubjectController,
  applyProgramBaseGroupsController,
} from "~/controllers/programCatalog.controller";
import { applyBaseGroupsToProgram } from "~/models/programCatalog.model";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin"]));

router.get("/", async (_req, res, next) => {
  try {
    const data = await getAllPrograms();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/catalog/apply-base", applyProgramBaseGroupsController);
router.post("/:id/catalog/assign-groups", assignProgramGroupsController);
router.delete("/:id/catalog/groups/:groupId", unassignProgramGroupController);
router.post("/:id/catalog/assign-subjects", assignProgramSubjectsController);
router.delete("/:id/catalog/subjects/:subjectId", unassignProgramSubjectController);

router.get("/:id/teachers", async (req, res, next) => {
  try {
    const teachers = await getProgramTeachers(req.params.id);
    res.json({ success: true, data: teachers });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/teachers", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.teacher_ids)
      ? (req.body.teacher_ids as string[]).filter((x) => typeof x === "string" && x.trim())
      : [];
    await setProgramTeachers(req.params.id, ids);
    const teachers = await getProgramTeachers(req.params.id);
    res.json({ success: true, data: teachers });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const program = await getProgramById(req.params.id);
    if (!program) {
      res.status(404).json({ success: false, error: "Không tìm thấy chuyên ngành" });
      return;
    }
    res.json({ success: true, data: program });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body as CreateProgramInput;
    if (!body.code?.trim() || !body.name?.trim()) {
      res.status(400).json({ success: false, error: "Mã và tên chuyên ngành là bắt buộc" });
      return;
    }
    const program = await createProgram(body);
    await applyBaseGroupsToProgram(program.id);
    res.status(201).json({ success: true, data: program });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Mã chuyên ngành đã tồn tại" });
      return;
    }
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const program = await updateProgram(req.params.id, req.body as UpdateProgramInput);
    if (!program) {
      res.status(404).json({ success: false, error: "Không tìm thấy chuyên ngành" });
      return;
    }
    res.json({ success: true, data: program });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Mã chuyên ngành đã tồn tại" });
      return;
    }
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const count = await pool.query<{ c: number }>(
      `SELECT COUNT(DISTINCT s.id)::int AS c
       FROM subjects s
       LEFT JOIN subject_groups sg ON sg.id = s.subject_group_id
       LEFT JOIN program_subject_groups psg
         ON psg.subject_group_id = sg.id AND psg.program_id = $1
       LEFT JOIN program_subjects ps ON ps.subject_id = s.id AND ps.program_id = $1
       WHERE s.is_active = true
         AND (
           sg.group_scope = 'base'
           OR psg.program_id IS NOT NULL
           OR ps.program_id IS NOT NULL
         )`,
      [req.params.id]
    );
    if ((count.rows[0]?.c ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: "Không xóa được: chuyên ngành còn môn học. Hãy chuyển hoặc xóa môn trước.",
      });
      return;
    }
    const deleted = await deleteProgram(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy chuyên ngành" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
