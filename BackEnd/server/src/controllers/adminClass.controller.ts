import { Request, Response, NextFunction } from "express";
import pool from "~/config/db";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";
import {
  getAllAdminClasses,
  getAdminClassById,
  getAdminClassesByManager,
  queryUnassignedStudents,
  queryStudentsByClass,
  teacherManagesClass,
  bulkRemoveStudentsFromClass,
} from "~/models/adminClass.model";
import {
  createAdminClassService,
  updateAdminClassService,
  deleteAdminClassService,
  assignStudentsToClass,
  removeStudentFromClass,
  buildImportTemplateBuffer,
  parseImportExcel,
  enrichImportPreview,
  confirmImportRows,
  addManualStudentToClass,
} from "~/services/adminClass.service";

async function canAccessClass(req: Request, classId: string): Promise<boolean> {
  const user = (req as { user?: { role?: string; userId?: string } }).user;
  if (user?.role === "admin") return true;
  if (user?.role === "teacher" && user.userId) {
    return teacherManagesClass(user.userId, classId);
  }
  return false;
}

export const listAdminClassesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as { user?: { role?: string; userId?: string } }).user;
    if (user?.role === "teacher" && user.userId) {
      const mine = await getAdminClassesByManager(user.userId);
      return res.json({ success: true, data: mine });
    }
    const data = await getAllAdminClasses();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { program_id, intake_year, section, display_name, manager_teacher_id, expected_size } =
      req.body;
    if (!program_id || intake_year == null || !section || !display_name) {
      return res.status(400).json({
        success: false,
        message: "program_id, intake_year, section, display_name là bắt buộc",
      });
    }
    const created = await createAdminClassService({
      program_id,
      intake_year: Number(intake_year),
      section: String(section),
      display_name: String(display_name),
      manager_teacher_id: manager_teacher_id || null,
      expected_size: expected_size != null ? Number(expected_size) : 0,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("tối đa") || msg.includes("trùng")) {
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

export const updateAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await updateAdminClassService(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("tối đa")) {
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

export const deleteAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteAdminClassService(req.params.id);
    res.json({ success: true, message: "Đã xóa lớp" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    return res.status(400).json({ success: false, message: msg || "Không xóa được lớp" });
  }
};

export const getAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const row = await getAdminClassById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lớp" });
    }
    if (!(await canAccessClass(req, req.params.id))) {
      return res.status(403).json({ success: false, message: "Không có quyền xem lớp này" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

export const listClassStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!(await canAccessClass(req, req.params.id))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const search = req.query.search as string | undefined;
    const result = await queryStudentsByClass(req.params.id, limit, offset, search);
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
};

export const listUnassignedStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const search = req.query.search as string | undefined;
    const result = await queryUnassignedStudents(limit, offset, search);
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) {
    next(err);
  }
};

export const assignStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const classId = req.params.id;
    if (!(await canAccessClass(req, classId))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const ids = Array.isArray(req.body?.student_ids) ? req.body.student_ids : [];
    const allowTransfer = Boolean(req.body?.allow_transfer);
    const result = await assignStudentsToClass(classId, ids, allowTransfer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const removeStudentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const classId = req.params.id;
    if (!(await canAccessClass(req, classId))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const ok = await removeStudentFromClass(classId, req.params.studentId);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên trong lớp" });
    }
    res.json({ success: true, message: "Đã gỡ sinh viên khỏi lớp" });
  } catch (err) {
    next(err);
  }
};

export const bulkRemoveStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const classId = req.params.id;
    if (!(await canAccessClass(req, classId))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const studentIds = Array.isArray(req.body?.student_ids) ? req.body.student_ids : [];
    if (studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "Thiếu danh sách sinh viên" });
    }
    const result = await bulkRemoveStudentsFromClass(classId, studentIds);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const addManualStudentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const classId = req.params.id;
    if (!(await canAccessClass(req, classId))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const result = await addManualStudentToClass(classId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    return res.status(400).json({ success: false, message: msg || "Thêm sinh viên thất bại" });
  }
};

export const importPreviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const classId = req.params.id;
    if (!(await canAccessClass(req, classId))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const file = (req as { file?: Express.Multer.File }).file;
    if (!file?.buffer) {
      return res.status(400).json({ success: false, message: "Thiếu file Excel" });
    }
    const allowTransfer = req.body?.allow_transfer === "true" || req.body?.allow_transfer === true;
    const parsed = parseImportExcel(file.buffer);
    const preview = await enrichImportPreview(classId, parsed, allowTransfer);
    res.json({ success: true, data: { rows: preview } });
  } catch (err) {
    next(err);
  }
};

export const importConfirmController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const classId = req.params.id;
    if (!(await canAccessClass(req, classId))) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    const studentIds = Array.isArray(req.body?.student_ids) ? req.body.student_ids : [];
    const creates = Array.isArray(req.body?.creates) ? req.body.creates : [];
    const allowTransfer = Boolean(req.body?.allow_transfer);
    const result = await confirmImportRows(classId, studentIds, creates, allowTransfer);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const downloadTemplateController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const buf = buildImportTemplateBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="mau-import-sinh-vien-lop.xlsx"'
    );
    res.send(buf);
  } catch (err) {
    next(err);
  }
};

export const getMyAdminClassController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as { user?: { role?: string; userId?: string } }).user;
    if (user?.role === "teacher" && user.userId) {
      const mine = await getAdminClassesByManager(user.userId);
      if (mine.length === 0) {
        return res.status(404).json({ success: false, message: "Chưa được gán lớp quản lý" });
      }
      return res.json({ success: true, data: mine.length === 1 ? mine[0] : mine });
    }
    if (user?.role === "student" && user.userId) {
      const { rows } = await pool.query(
        `SELECT ac.* FROM admin_classes ac
         JOIN accounts a ON a.admin_class_id = ac.id
         WHERE a.id = $1`,
        [user.userId]
      );
      if (!rows[0]) {
        return res.status(404).json({ success: false, message: "Chưa thuộc lớp hành chính" });
      }
      return res.json({ success: true, data: rows[0] });
    }
    res.status(400).json({ success: false, message: "Chỉ dành cho giáo viên hoặc sinh viên" });
  } catch (err) {
    next(err);
  }
};
