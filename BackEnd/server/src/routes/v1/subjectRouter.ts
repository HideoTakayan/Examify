import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";
import { querySubjectsPaginated } from "~/models/subject.model";
import {
  createSubjectWithPrerequisites,
  updateSubjectWithPrerequisites,
  replaceSubjectPrerequisites,
  getSubjectDetailById,
} from "~/services/subject.service";
import { deleteSubject, deleteSubjectsByIds } from "~/models/subject.model";
import type { CreateSubjectInput, UpdateSubjectInput } from "~/models/subject.model";
import {
  getSubjectCatalog,
  getSubjectPickerCatalog,
  getSubjectWarehouseCatalog,
} from "~/services/subjectCatalog.service";
import { getSubjectIdsForCatalogGroup } from "~/services/subjectCatalogGroup.service";
import {
  buildSubjectImportTemplateBuffer,
  parseSubjectImportExcel,
  enrichSubjectImportPreview,
  confirmSubjectImport,
} from "~/services/subjectImport.service";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);

/** GET /v1/subjects/warehouse — kho nhóm môn + môn (master) */
router.get(
  "/warehouse",
  roleMiddleware(["admin"]),
  async (_req, res, next) => {
    try {
      const data = await getSubjectWarehouseCatalog();
      res.json({ success: true, data });
    } catch (err: unknown) {
      next(err);
    }
  }
);

/** GET /v1/subjects/catalog — CTĐT một ngành: nhóm + môn đã gán / kế thừa base */
router.get(
  "/catalog",
  roleMiddleware(["admin", "teacher", "student"]),
  async (req, res, next) => {
    try {
      const programId = req.query.program_id as string | undefined;
      const hideEmpty = req.query.hide_empty === "true";
      const data = await getSubjectCatalog(programId, { hideEmptyGroups: hideEmpty });
      res.json({ success: true, data });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 500;
      const message = err instanceof Error ? err.message : "Lỗi tải catalog";
      if (status < 500) {
        res.status(status).json({ success: false, error: message });
        return;
      }
      next(err);
    }
  }
);

/** GET /v1/subjects/picker-catalog — nhóm môn theo chuyên ngành của user (GV→lớp→ngành) */
router.get(
  "/picker-catalog",
  roleMiddleware(["admin", "teacher", "student"]),
  async (req, res, next) => {
    try {
      const user = (req as { user?: { userId?: string; role?: string } }).user;
      const data = await getSubjectPickerCatalog({
        userId: user?.userId,
        userRole: user?.role,
        ...(user?.role === "admin"
          ? {
              programId: req.query.program_id as string | undefined,
              programCode: req.query.program_code as string | undefined,
              adminClassId: req.query.admin_class_id as string | undefined,
            }
          : {}),
      });
      res.json({ success: true, data });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 500;
      const message = err instanceof Error ? err.message : "Lỗi tải catalog";
      if (status < 500) {
        res.status(status).json({ success: false, error: message });
        return;
      }
      next(err);
    }
  }
);

router.use(roleMiddleware(["admin", "teacher"]));

/** GET /v1/subjects */
router.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const search = req.query.search as string | undefined;
    const programId = req.query.program_id as string | undefined;
    const subCategory = req.query.sub_category as string | undefined;
    const subjectGroupId = req.query.subject_group_id as string | undefined;
    const catalogGroupId = req.query.catalog_group as string | undefined;
    let catalogGroup: { code: string; subjectIds: string[] } | undefined;
    let groupIdFilter = subjectGroupId;
    if (catalogGroupId?.trim()) {
      const key = catalogGroupId.trim();
      const isUuid = /^[0-9a-f-]{36}$/i.test(key);
      if (isUuid) {
        groupIdFilter = key;
      } else {
        catalogGroup = {
          code: key,
          subjectIds: await getSubjectIdsForCatalogGroup(key),
        };
      }
    }
    const result = await querySubjectsPaginated(
      limit,
      offset,
      search,
      programId,
      subCategory,
      groupIdFilter,
      catalogGroup
    );
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /v1/subjects/import-template — file Excel mẫu import môn */
router.get(
  "/import-template",
  roleMiddleware(["admin"]),
  (_req, res, next) => {
    try {
      const buf = buildSubjectImportTemplateBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="mau-import-mon-hoc.xlsx"'
      );
      res.send(buf);
    } catch (err) {
      next(err);
    }
  }
);

/** POST /v1/subjects/import/preview — xem trước import Excel */
router.post(
  "/import/preview",
  roleMiddleware(["admin"]),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file?.buffer) {
        res.status(400).json({ success: false, error: "Thiếu file Excel" });
        return;
      }
      const programId = String(req.body?.program_id ?? "").trim();
      const subjectGroupId = String(req.body?.subject_group_id ?? "").trim();
      if (!programId || !subjectGroupId) {
        res.status(400).json({
          success: false,
          error: "Cần program_id và subject_group_id",
        });
        return;
      }
      const parsed = parseSubjectImportExcel(file.buffer);
      const rows = await enrichSubjectImportPreview(parsed, programId, subjectGroupId);
      res.json({ success: true, data: { rows } });
    } catch (err) {
      next(err);
    }
  }
);

/** POST /v1/subjects/import/confirm — tạo hàng loạt môn */
router.post(
  "/import/confirm",
  roleMiddleware(["admin"]),
  async (req, res, next) => {
    try {
      const programId = String(req.body?.program_id ?? "").trim();
      const subjectGroupId = String(req.body?.subject_group_id ?? "").trim();
      const rawRows = req.body?.rows;
      if (!programId || !subjectGroupId) {
        res.status(400).json({
          success: false,
          error: "Cần program_id và subject_group_id",
        });
        return;
      }
      const rows = Array.isArray(rawRows)
        ? rawRows.filter(
            (r): r is { name: string } =>
              r &&
              typeof r === "object" &&
              typeof (r as { name?: unknown }).name === "string" &&
              (r as { name: string }).name.trim().length > 0
          )
        : [];
      if (rows.length === 0) {
        res.status(400).json({ success: false, error: "Danh sách môn trống" });
        return;
      }
      if (rows.length > 200) {
        res.status(400).json({ success: false, error: "Tối đa 200 môn mỗi lần import" });
        return;
      }
      const result = await confirmSubjectImport(programId, subjectGroupId, rows);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import thất bại";
      res.status(400).json({ success: false, error: message });
    }
  }
);

/** POST /v1/subjects/bulk-delete — xóa nhiều môn (admin) */
router.post(
  "/bulk-delete",
  roleMiddleware(["admin"]),
  async (req, res, next) => {
    try {
      const raw = req.body?.ids;
      const ids = Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        : [];
      if (ids.length === 0) {
        res.status(400).json({ success: false, error: "Danh sách ids trống" });
        return;
      }
      if (ids.length > 200) {
        res.status(400).json({ success: false, error: "Tối đa 200 môn mỗi lần xóa" });
        return;
      }
      const result = await deleteSubjectsByIds(ids);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/** GET /v1/subjects/:id — kèm danh sách môn tiên quyết */
router.get("/:id", async (req, res, next) => {
  try {
    const subject = await getSubjectDetailById(req.params.id);
    if (!subject) {
      res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
      return;
    }
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

/** PUT /v1/subjects/:id/prerequisites — admin chỉnh phụ thuộc */
router.put(
  "/:id/prerequisites",
  roleMiddleware(["admin"]),
  async (req, res, next) => {
    try {
      const raw = req.body?.prerequisite_ids;
      const prerequisiteIds = Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === "string")
        : [];
      const subject = await replaceSubjectPrerequisites(
        req.params.id,
        prerequisiteIds
      );
      if (!subject) {
        res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
        return;
      }
      res.json({ success: true, data: subject });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 500;
      const message = err instanceof Error ? err.message : "Lỗi cập nhật phụ thuộc";
      if (status < 500) {
        res.status(status).json({ success: false, error: message });
        return;
      }
      next(err);
    }
  }
);

/** POST /v1/subjects — tạo môn + prerequisite_ids (admin) */
router.post("/", roleMiddleware(["admin"]), async (req, res, next) => {
  try {
    const body = req.body as CreateSubjectInput & { prerequisite_ids?: string[] };
    if (!body.name?.trim()) {
      res.status(400).json({ success: false, error: "Tên môn học là bắt buộc" });
      return;
    }
    const subject = await createSubjectWithPrerequisites(body);
    res.status(201).json({ success: true, data: subject });
  } catch (err: unknown) {
    const pg = err as { code?: string; status?: number; message?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Tên môn học đã tồn tại" });
      return;
    }
    if (pg.status && pg.status < 500) {
      res.status(pg.status).json({ success: false, error: pg.message });
      return;
    }
    next(err);
  }
});

/** PATCH /v1/subjects/:id */
router.patch("/:id", roleMiddleware(["admin"]), async (req, res, next) => {
  try {
    const subject = await updateSubjectWithPrerequisites(
      req.params.id,
      req.body as UpdateSubjectInput
    );
    if (!subject) {
      res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
      return;
    }
    res.json({ success: true, data: subject });
  } catch (err: unknown) {
    const pg = err as { code?: string; status?: number; message?: string };
    if (pg.code === "23505") {
      res.status(409).json({ success: false, error: "Tên môn học đã tồn tại" });
      return;
    }
    if (pg.status && pg.status < 500) {
      res.status(pg.status).json({ success: false, error: pg.message });
      return;
    }
    next(err);
  }
});

router.delete("/:id", roleMiddleware(["admin"]), async (req, res, next) => {
  try {
    const deleted = await deleteSubject(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy môn học" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
