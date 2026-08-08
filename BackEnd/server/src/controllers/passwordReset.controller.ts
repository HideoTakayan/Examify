import { Request, Response, NextFunction } from "express";
import {
  requestPasswordReset,
  listPendingResetRequestsPaginated,
  approveResetRequest,
  rejectResetRequest,
  getMyResetRequests,
} from "~/services/passwordReset.service";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";

export const createResetRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id là bắt buộc" });
    }
    const result = await requestPasswordReset(user.userId, user_id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    next(err);
  }
};

export const getPendingResetRequestsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const result = await listPendingResetRequestsPaginated(limit, offset);
    res.json({
      success: true,
      data: buildPaginatedList(result.items, result.total, limit, offset),
    });
  } catch (err: any) {
    next(err);
  }
};

export const approveResetRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { request_id, admin_note } = req.body;
    if (!request_id) {
      return res.status(400).json({ success: false, message: "request_id là bắt buộc" });
    }
    const result = await approveResetRequest(request_id, user.userId, admin_note);
    res.json({ success: true, data: result });
  } catch (err: any) {
    next(err);
  }
};

export const rejectResetRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const { request_id, admin_note } = req.body;
    if (!request_id) {
      return res.status(400).json({ success: false, message: "request_id là bắt buộc" });
    }
    await rejectResetRequest(request_id, user.userId, admin_note);
    res.json({ success: true, message: "Đã từ chối yêu cầu" });
  } catch (err: any) {
    next(err);
  }
};

export const getMyResetRequestsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const data = await getMyResetRequests(user.userId);
    res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
};

/** Đã đăng nhập: gửi yêu cầu đặt lại MK cho chính mình → admin duyệt. */
export const submitMyResetRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Quản trị viên đổi mật khẩu trực tiếp trong Cài đặt tài khoản.",
      });
    }
    const result = await requestPasswordReset(user.userId, user.userId);
    res.json({
      success: true,
      message: "Yêu cầu đã được gửi lên quản trị viên. Vui lòng chờ xử lý.",
      data: result,
    });
  } catch (err: any) {
    next(err);
  }
};
