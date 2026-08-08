import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  createResetRequestController,
  getPendingResetRequestsController,
  approveResetRequestController,
  rejectResetRequestController,
  getMyResetRequestsController,
  submitMyResetRequestController,
} from "~/controllers/passwordReset.controller";
import { requestPasswordReset } from "~/services/passwordReset.service";
import pool from "~/config/db";

// ── Public: không cần auth ──────────────────────────────────────────────
const publicRouter = Router();

publicRouter.post(
  "/self",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "email là bắt buộc" });
      }
      const user = await pool.query(
        "SELECT id, role FROM accounts WHERE email = $1",
        [email]
      );
      if (user.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản với email này" });
      }
      if (user.rows[0].role === "admin") {
        return res.status(400).json({
          success: false,
          message:
            "Tài khoản quản trị không hỗ trợ quên mật khẩu qua email. Liên hệ kỹ thuật hoặc đổi mật khẩu khi đã đăng nhập.",
        });
      }
      const targetUserId = user.rows[0].id;
      const result = await requestPasswordReset(targetUserId, targetUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      next(err);
    }
  }
);

// ── Authenticated routes ────────────────────────────────────────────────
const authedRouter = Router();

authedRouter.use(authMiddleware);

authedRouter.post(
  "/",
  roleMiddleware(["admin"]),
  createResetRequestController
);

authedRouter.get(
  "/pending",
  roleMiddleware(["admin"]),
  getPendingResetRequestsController
);

authedRouter.post(
  "/approve",
  roleMiddleware(["admin"]),
  approveResetRequestController
);

authedRouter.post(
  "/reject",
  roleMiddleware(["admin"]),
  rejectResetRequestController
);

authedRouter.get(
  "/me",
  roleMiddleware(["teacher", "student"]),
  getMyResetRequestsController
);

authedRouter.post(
  "/me",
  roleMiddleware(["teacher", "student"]),
  submitMyResetRequestController
);

// Mount: /password-reset/self → public, /password-reset/* → authed
const passwordResetRouter = Router();
passwordResetRouter.use(publicRouter);
passwordResetRouter.use(authedRouter);

export default passwordResetRouter;
