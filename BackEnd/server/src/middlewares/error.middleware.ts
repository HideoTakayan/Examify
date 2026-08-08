import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[${req.method}] ${req.path} —`, err?.message || err);

  // Duplicate key PostgreSQL
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "Dữ liệu đã tồn tại" });
  }

  // Foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({ success: false, message: "Tham chiếu không hợp lệ" });
  }

  const status = err.status || err.statusCode || 500;
  let message = err.message || "Internal server error";

  const code = err.code as string | undefined;
  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKET" ||
    /connection timeout/i.test(message) ||
    /connect ETIMEDOUT/i.test(message)
  ) {
    message =
      "Không kết nối được máy chủ SMTP (timeout). Trên Render gói Free cổng 587/465 bị chặn — hãy thêm RESEND_API_KEY hoặc nâng gói Render.";
  }

  res.status(status).json({ success: false, message });
};