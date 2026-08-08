import { Router } from "express";
import { roleMiddleware } from "~/middlewares/role.middleware";
import { startExamSessionController, submitSessionController } from "~/controllers/examSession.controller";

const examSessionRouter = Router();

examSessionRouter.post("/", roleMiddleware(["student"]), startExamSessionController);
examSessionRouter.post("/:sessionId/submit", roleMiddleware(["student"]), submitSessionController);

export default examSessionRouter;
