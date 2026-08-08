import { Request, Response, NextFunction } from "express";
import {
  grantRetakeService,
  revokeRetakeService,
  listRetakeGrantsForExamService,
  listMyRetakeGrantsService,
} from "~/services/examRetake.service";

function getUser(req: Request) {
  return (req as { user?: { userId?: string; role?: string } }).user;
}

export const grantRetakeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    const studentId = (req.body.student_id as string | undefined)?.trim();
    const reason = (req.body.reason as string | undefined) ?? "";
    if (!studentId) {
      return res.status(400).json({ success: false, message: "student_id là bắt buộc" });
    }
    if (!user?.userId || !user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const data = await grantRetakeService({
      examId: req.params.examId,
      studentId,
      grantedBy: user.userId,
      grantedByRole: user.role,
      reason,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const revokeRetakeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    if (!user?.userId || !user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await revokeRetakeService(req.params.grantId, user.userId, user.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listExamRetakeGrantsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    if (!user?.userId || !user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await listRetakeGrantsForExamService(
      req.params.examId,
      user.userId,
      user.role
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMyRetakeGrantsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUser(req);
    if (!user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await listMyRetakeGrantsService(user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
