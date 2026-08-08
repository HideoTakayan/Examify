import { Request, Response, NextFunction } from "express";
import { getSystemReport } from "~/services/adminSystemReport.service";

export const getSystemReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getSystemReport();
    res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
};
