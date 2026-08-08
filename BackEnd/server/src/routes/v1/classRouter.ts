import { Router } from "express";
import { getClassListController } from "~/controllers/class.controller";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";

const classRouter = Router();

classRouter.use(authMiddleware);

classRouter.get("/", roleMiddleware(["admin", "teacher", "student"]), getClassListController);

export default classRouter;
