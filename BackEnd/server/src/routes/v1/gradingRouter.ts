import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  getOfferingsController,
  getOfferingStudentsController,
  saveGradesController,
  syncExamGradesController,
} from "~/controllers/grading.controller";

const gradingRouter = Router();

gradingRouter.use(authMiddleware);
gradingRouter.use(roleMiddleware(["teacher", "admin"]));

gradingRouter.get("/offerings", getOfferingsController);
gradingRouter.get("/offerings/:id/students", getOfferingStudentsController);
gradingRouter.post("/offerings/:id/grades", saveGradesController);
gradingRouter.post("/offerings/:id/sync", syncExamGradesController);

export default gradingRouter;
