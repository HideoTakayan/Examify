import { Request, Response, NextFunction } from "express";
import { getAuditLogsService } from "~/services/auditLog.service";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";

export const getAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>, {
      defaultLimit: 50,
    });
    const filter = {
      action: req.query.action as any,
      actor_id: req.query.actor_id as string | undefined,
      resource_type: req.query.resource_type as string | undefined,
      resource_id: req.query.resource_id as string | undefined,
      from_date: req.query.from_date as string | undefined,
      to_date: req.query.to_date as string | undefined,
      limit,
      offset,
    };
    const result = await getAuditLogsService(filter);
    const data = buildPaginatedList(result.logs, result.total, limit, offset);
    res.json({ success: true, data });
  } catch (err: any) {
    next(err);
  }
};
