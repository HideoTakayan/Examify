import { Request, Response, NextFunction } from "express";
import { getDashboardForUser, listDashboardActivityForUser } from "~/services/dashboard.service";
import { parsePaginationQuery } from "~/utils/pagination";

export const getDashboardController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as { user?: { userId: string; role: string } }).user;
    if (!user?.userId || !user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await getDashboardForUser(user.userId, user.role as "admin" | "teacher" | "student");
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDashboardActivityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as { user?: { userId: string; role: string } }).user;
    if (!user?.userId || !user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const role = user.role;
    if (role !== "admin" && role !== "teacher") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const pagination = parsePaginationQuery(req.query as Record<string, unknown>);
    const q = req.query as Record<string, string | undefined>;
    const data = await listDashboardActivityForUser(
      user.userId,
      role,
      pagination,
      {
        status: q.status,
        keyword: q.keyword,
        time: q.time,
      }
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
