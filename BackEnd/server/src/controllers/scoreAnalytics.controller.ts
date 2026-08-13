import { Request, Response, NextFunction } from "express";
import {
  getExamScoreDistribution,
  getSubjectOptions,
  getSubjectScoreAnalytics,
  getItemAnalysis,
  resolveAdminClassIdForAnalytics,
  assertTeacherCanAccessClass,
} from "~/services/scoreAnalytics.service";
import { assertTeacherCanManageExam } from "~/services/exam.service";

function getAuthUser(req: Request) {
  return (req as { user?: { role?: string; userId?: string } }).user;
}

export const getExamScoreDistributionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getAuthUser(req);
    if (user && user.userId && user.role) {
      await assertTeacherCanManageExam(req.params.examId, user.userId, user.role);
    }
    const data = await getExamScoreDistribution(req.params.examId);
    res.json({ success: true, data });
  } catch (err: unknown) {
    next(err);
  }
};

export const getSubjectOptionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getAuthUser(req);
    const queryClassId = (req.query.admin_class_id as string | undefined)?.trim() || undefined;
    const adminClassId = await resolveAdminClassIdForAnalytics(
      user?.role,
      user?.userId,
      queryClassId
    );

    if (adminClassId === undefined) {
      return res.status(400).json({
        success: false,
        message: "Chưa được gán lớp chủ nhiệm. Liên hệ admin.",
      });
    }

    await assertTeacherCanAccessClass(user?.role, user?.userId, adminClassId);

    const data = await getSubjectOptions(adminClassId);
    res.json({ success: true, data });
  } catch (err: unknown) {
    next(err);
  }
};

export const getSubjectScoreAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getAuthUser(req);
    const subjectId = (req.query.subject_id as string | undefined)?.trim();
    if (!subjectId) {
      return res.status(400).json({ success: false, message: "subject_id là bắt buộc" });
    }

    const queryClassId = (req.query.admin_class_id as string | undefined)?.trim() || undefined;
    const adminClassId = await resolveAdminClassIdForAnalytics(
      user?.role,
      user?.userId,
      queryClassId
    );

    if (adminClassId === undefined) {
      return res.status(400).json({
        success: false,
        message: "Chưa được gán lớp chủ nhiệm. Liên hệ admin.",
      });
    }

    await assertTeacherCanAccessClass(user?.role, user?.userId, adminClassId);

    const data = await getSubjectScoreAnalytics(adminClassId, subjectId);
    res.json({ success: true, data });
  } catch (err: unknown) {
    next(err);
  }
};

export const getItemAnalysisController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getAuthUser(req);
    if (user && user.userId && user.role) {
      await assertTeacherCanManageExam(req.params.examId, user.userId, user.role);
    }
    const data = await getItemAnalysis(req.params.examId);
    res.json({ success: true, data });
  } catch (err: unknown) {
    next(err);
  }
};
