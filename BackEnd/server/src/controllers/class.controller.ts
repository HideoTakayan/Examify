import { Request, Response, NextFunction } from "express";
import { listClassesForRole } from "~/services/class.service";

export const getClassListController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    const data = await listClassesForRole(user.userId, user.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
