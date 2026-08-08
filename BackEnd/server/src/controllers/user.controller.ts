import { Request, Response, NextFunction } from "express";
import {
  listUsersPaginated,
  getUserDetail,
  createUserService,
  updateUserService,
  deleteUserService,
  bulkDeleteUsersService,
  adminResetPasswordService,
} from "~/services/user.service";
import type { UserRole } from "~/models/user.model";
import { changePasswordService } from "~/services/auth.service";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const role = req.query.role as UserRole | undefined;
    const rolesRaw = req.query.roles as string | undefined;
    const roles = rolesRaw
      ? rolesRaw.split(",").map((r) => r.trim()).filter((r): r is UserRole =>
          r === "admin" || r === "teacher" || r === "student"
        )
      : undefined;
    const search = req.query.search as string | undefined;
    const search_student = req.query.search_student as string | undefined;
    const search_teacher = req.query.search_teacher as string | undefined;
    const admin_class_id = req.query.admin_class_id as string | undefined;
    const result = await listUsersPaginated(limit, offset, {
      role,
      roles,
      search,
      search_student,
      search_teacher,
      admin_class_id,
    });
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err) { next(err); }
};

export const getUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserDetail(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password, role, full_name, admin_class_id } = req.body;
    if (!email || !username || !password || !role) {
      return res.status(400).json({ success: false, message: "email/username/password/role là bắt buộc" });
    }
    const user = await createUserService(
      email,
      username,
      password,
      role,
      full_name,
      admin_class_id
    );
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { full_name, is_active, role, username, email, password } = req.body;
    const user = await updateUserService(req.params.id, {
      full_name,
      is_active,
      role,
      username,
      email,
      password,
    });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("đã tồn tại")) {
      return res.status(409).json({ success: false, message: msg });
    }
    next(err);
  }
};

export const bulkDeleteUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body?.ids;
    const ids = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids là bắt buộc" });
    }
    const result = await bulkDeleteUsersService(ids);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await deleteUserService(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, message: "Đã xóa người dùng" });
  } catch (err) { next(err); }
};

export const adminResetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await adminResetPasswordService(req.params.id);
    res.json({
      success: true,
      message: result.email_sent
        ? "Đã đặt mật khẩu mới và gửi email cho người dùng"
        : "Đã đặt mật khẩu mới (gửi email thất bại — kiểm tra cấu hình SMTP)",
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Không tìm thấy") || msg.includes("Chỉ đặt lại")) {
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { current_password, new_password, device_id, device_info } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: "current_password và new_password là bắt buộc" });
    }

    const actor = (req as any).user;
    const targetId = req.params.id;

    // Student chỉ được đổi password của chính mình. Admin được đổi của ai cũng được.
    if (actor.role !== "admin" && actor.userId !== targetId) {
      return res.status(403).json({ success: false, message: "Không có quyền đổi password này" });
    }

    const deviceId =
      (typeof device_id === "string" && device_id.trim()) ||
      (typeof req.headers["x-device-id"] === "string" && req.headers["x-device-id"].trim()) ||
      "web";

    const result = await changePasswordService(
      targetId,
      current_password,
      new_password,
      deviceId,
      typeof device_info === "string" ? device_info : null
    );
    res.json({
      success: true,
      message: "Đã đổi mật khẩu thành công",
      data: { token: result.token, user: result.user, first_login: false },
    });
  } catch (err: any) {
    if (err.message?.includes("hiện tại không đúng") || err.message?.includes("ít nhất 8")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};