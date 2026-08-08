import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createSubjectGroup,
  deleteSubjectGroup,
  getSubjectGroupById,
  getSubjectGroupsByProgram,
  updateSubjectGroup,
  type CreateSubjectGroupInput,
  type UpdateSubjectGroupInput,
} from "~/models/subjectGroup.model";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin"]));

/** @deprecated Đọc danh sách nhóm qua GET /v1/subjects/catalog?program_id=… */
router.get("/", async (req, res, next) => {
  try {
    const programId = req.query.program_id as string | undefined;
    if (!programId?.trim()) {
      res.status(400).json({
        success: false,
        error: "program_id là bắt buộc. Dùng GET /v1/subjects/catalog thay cho endpoint này.",
      });
      return;
    }
    const data = await getSubjectGroupsByProgram(programId.trim());
    res.json({
      success: true,
      data,
      deprecated: "Dùng GET /v1/subjects/catalog?program_id=… để đồng bộ nhóm + môn.",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const group = await getSubjectGroupById(req.params.id);
    if (!group) {
      res.status(404).json({ success: false, error: "Không tìm thấy nhóm môn" });
      return;
    }
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body as CreateSubjectGroupInput & { program_id?: string };
    if (!body.code?.trim() || !body.name?.trim()) {
      res.status(400).json({ success: false, error: "code, name là bắt buộc" });
      return;
    }
    const group = await createSubjectGroup({
      code: body.code,
      name: body.name,
      description: body.description,
      sort_order: body.sort_order,
      group_scope: body.group_scope,
    });
    res.status(201).json({ success: true, data: group });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Mã nhóm môn đã tồn tại trong ngành này" });
      return;
    }
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const group = await updateSubjectGroup(req.params.id, req.body as UpdateSubjectGroupInput);
    if (!group) {
      res.status(404).json({ success: false, error: "Không tìm thấy nhóm môn" });
      return;
    }
    res.json({ success: true, data: group });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Mã nhóm môn đã tồn tại trong ngành này" });
      return;
    }
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await deleteSubjectGroup(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy nhóm môn" });
      return;
    }
    res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "GROUP_HAS_SUBJECTS") {
      res.status(400).json({
        success: false,
        error: "Không xóa được: nhóm còn môn học. Hãy chuyển hoặc xóa môn trước.",
      });
      return;
    }
    next(err);
  }
});

export default router;
