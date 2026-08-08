import { Request, Response, NextFunction } from "express";
import { verifyTokenPayload } from "~/services/auth.service";
import {
  isPasswordChangeExempt,
  mustChangePassword,
} from "~/middlewares/firstLogin.middleware";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Token không hợp lệ" });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = await verifyTokenPayload(token);
    (req as any).user = payload;

    if (mustChangePassword(payload) && !isPasswordChangeExempt(req, payload.userId)) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "Bạn phải đổi mật khẩu trước khi tiếp tục sử dụng hệ thống",
      });
    }

    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, message: error.message || "Unauthorized" });
  }
};