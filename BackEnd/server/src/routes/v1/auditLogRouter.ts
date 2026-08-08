import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { getAuditLogsController } from "~/controllers/auditLog.controller";

const auditLogRouter = Router();

auditLogRouter.use(authMiddleware);

auditLogRouter.get(
  "/",
  roleMiddleware(["admin"]),
  getAuditLogsController
);

export default auditLogRouter;
