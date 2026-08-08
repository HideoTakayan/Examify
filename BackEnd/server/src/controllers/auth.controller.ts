import { Request, Response, NextFunction } from "express";
import { loginUser, logoutUser, registerUser } from "~/services/auth.service";
import type { TokenPayload } from "~/services/authToken.service";
import { mustChangePassword } from "~/middlewares/firstLogin.middleware";
import { auditLogin } from "~/services/auditHelpers";

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password, role, full_name } = req.body;
    if (!email || !username || !password || !role) {
      return res.status(400).json({ success: false, message: "email/username/password/role là bắt buộc" });
    }
    const user = await registerUser(email, username, password, role, full_name);
    return res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    next(err);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, device_id, device_info } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email/password là bắt buộc" });
    }
    const result = await loginUser(email, password, device_id || "unknown", device_info);
    await auditLogin(result.user.id, result.user.role, req);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    const msg = err?.message || "";
    if (
      msg.includes("Email hoặc mật khẩu không đúng") ||
      msg.includes("Tài khoản đã bị vô hiệu hóa")
    ) {
      return res.status(401).json({ success: false, message: msg });
    }
    next(err);
  }
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Token không hợp lệ" });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    await logoutUser(token);
    return res.status(200).json({ success: true, message: "Đã đăng xuất" });
  } catch (err: unknown) {
    next(err);
  }
};

export const sessionController = async (req: Request, res: Response) => {
  const payload = (req as Request & { user?: TokenPayload }).user;
  if (!payload?.userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const requires_password_change = mustChangePassword(payload);
  return res.status(200).json({
    success: true,
    data: {
      valid: true,
      userId: payload.userId,
      role: payload.role,
      first_login: payload.first_login,
      requires_password_change,
    },
  });
};