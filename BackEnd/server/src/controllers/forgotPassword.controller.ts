import { Request, Response, NextFunction } from "express";
import { forgotPassword, resetPassword } from "~/services/forgotPassword.service";

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: "Email là bắt buộc" });
      return;
    }
    const result = await forgotPassword(email);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ success: false, error: "token và password là bắt buộc" });
      return;
    }
    const result = await resetPassword(token, password);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, message: "Mật khẩu đã được đặt lại thành công." });
  } catch (err) {
    next(err);
  }
};