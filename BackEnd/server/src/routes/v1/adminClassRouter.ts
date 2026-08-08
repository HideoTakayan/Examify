import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import {
  listAdminClassesController,
  createAdminClassController,
  updateAdminClassController,
  deleteAdminClassController,
  getAdminClassController,
  getMyAdminClassController,
  listClassStudentsController,
  listUnassignedStudentsController,
  assignStudentsController,
  removeStudentController,
  bulkRemoveStudentsController,
  addManualStudentController,
  importPreviewController,
  importConfirmController,
  downloadTemplateController,
} from "~/controllers/adminClass.controller";

const adminClassRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

adminClassRouter.use(authMiddleware);

adminClassRouter.get(
  "/import-template",
  roleMiddleware(["admin", "teacher"]),
  downloadTemplateController
);

adminClassRouter.get(
  "/unassigned-students",
  roleMiddleware(["admin", "teacher"]),
  listUnassignedStudentsController
);

adminClassRouter.get(
  "/me",
  roleMiddleware(["admin", "teacher", "student"]),
  getMyAdminClassController
);

adminClassRouter.get("/", roleMiddleware(["admin", "teacher"]), listAdminClassesController);

adminClassRouter.post("/", roleMiddleware(["admin"]), createAdminClassController);

adminClassRouter.get("/:id", roleMiddleware(["admin", "teacher"]), getAdminClassController);

adminClassRouter.patch("/:id", roleMiddleware(["admin"]), updateAdminClassController);

adminClassRouter.delete("/:id", roleMiddleware(["admin"]), deleteAdminClassController);

adminClassRouter.get(
  "/:id/students",
  roleMiddleware(["admin", "teacher"]),
  listClassStudentsController
);

adminClassRouter.post(
  "/:id/students/assign",
  roleMiddleware(["admin", "teacher"]),
  assignStudentsController
);

adminClassRouter.post(
  "/:id/students/manual",
  roleMiddleware(["admin", "teacher"]),
  addManualStudentController
);

adminClassRouter.post(
  "/:id/students/import/preview",
  roleMiddleware(["admin", "teacher"]),
  upload.single("file"),
  importPreviewController
);

adminClassRouter.post(
  "/:id/students/import/confirm",
  roleMiddleware(["admin", "teacher"]),
  importConfirmController
);

adminClassRouter.post(
  "/:id/students/bulk-remove",
  roleMiddleware(["admin", "teacher"]),
  bulkRemoveStudentsController
);

adminClassRouter.delete(
  "/:id/students/:studentId",
  roleMiddleware(["admin", "teacher"]),
  removeStudentController
);

export default adminClassRouter;
