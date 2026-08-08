import { Request, Response, NextFunction } from "express";
import { UserRole } from "~/models/user.model";

export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: không đủ quyền" });
    }

    next();
  };
};