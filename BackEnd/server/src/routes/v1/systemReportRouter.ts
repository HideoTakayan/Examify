import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { getSystemReportController } from "~/controllers/adminSystemReport.controller";

const systemReportRouter = Router();

systemReportRouter.use(authMiddleware);

systemReportRouter.get(
  "/",
  roleMiddleware(["admin"]),
  getSystemReportController
);

export default systemReportRouter;
