import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  listStudentsController,
  updateStudentController,
  getGradeReportExamsController,
  getGradeReportController,
  exportGradeReportController,
  sendGradeReportEmailController,
  getStudentTranscriptController,
  exportStudentTranscriptController,
} from "~/controllers/teacherStudents.controller";

const teacherStudentsRouter = Router();

teacherStudentsRouter.use(authMiddleware);

const teacherOnly = roleMiddleware(["teacher"]);
const teacherOrAdmin = roleMiddleware(["teacher", "admin"]);

teacherStudentsRouter.get("/grade-report/exams", teacherOrAdmin, getGradeReportExamsController);
teacherStudentsRouter.get("/grade-report/export", teacherOrAdmin, exportGradeReportController);
teacherStudentsRouter.get("/grade-report", teacherOrAdmin, getGradeReportController);
teacherStudentsRouter.post("/grade-report/email", teacherOnly, sendGradeReportEmailController);

teacherStudentsRouter.get("/", teacherOnly, listStudentsController);
teacherStudentsRouter.get("/:id/transcript/export", teacherOrAdmin, exportStudentTranscriptController);
teacherStudentsRouter.get("/:id/transcript", teacherOrAdmin, getStudentTranscriptController);
teacherStudentsRouter.patch("/:id", teacherOnly, updateStudentController);

export default teacherStudentsRouter;
