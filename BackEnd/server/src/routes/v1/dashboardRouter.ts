import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getDashboardController,
  getDashboardActivityController,
} from "~/controllers/dashboard.controller";

const dashboardRouter = Router();

/** Không cần JWT — để kiểm tra deploy / reverse-proxy có forward `/v1/dashboard` tới Node hay không. */
dashboardRouter.get("/ping", (_req, res) => {
  res.json({ success: true, message: "dashboard route ok", path: "/v1/dashboard/ping" });
});

dashboardRouter.use(authMiddleware);
dashboardRouter.get("/", roleMiddleware(["admin", "teacher", "student"]), getDashboardController);
dashboardRouter.get(
  "/activity",
  roleMiddleware(["admin", "teacher"]),
  getDashboardActivityController
);

export default dashboardRouter;
