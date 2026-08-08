import { Request } from "express";
import { logAudit } from "~/services/auditLog.service";

export const getClientIp = (req: Request): string | null => {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) {
    const first = Array.isArray(fwd) ? fwd[0] : fwd.split(",")[0];
    return first?.trim() ?? null;
  }
  return req.socket.remoteAddress ?? null;
};

export const auditLogin = (actorId: string, actorRole: string, req: Request) =>
  logAudit({
    actor_id: actorId,
    actor_role: actorRole,
    action: "login",
    details: {},
    ip_address: getClientIp(req),
    user_agent: req.headers["user-agent"] ?? null,
  });

export const auditAccountCreate = (
  actorId: string,
  actorRole: string,
  newUserId: string,
  req: Request
) =>
  logAudit({
    actor_id: actorId,
    actor_role: actorRole,
    action: "create_account",
    resource_type: "account",
    resource_id: newUserId,
    ip_address: getClientIp(req),
    user_agent: req.headers["user-agent"] ?? null,
  });

export const auditGradeSession = (
  actorId: string,
  actorRole: string,
  sessionId: string,
  req: Request
) =>
  logAudit({
    actor_id: actorId,
    actor_role: actorRole,
    action: "grade_session",
    resource_type: "exam_session",
    resource_id: sessionId,
    ip_address: getClientIp(req),
    user_agent: req.headers["user-agent"] ?? null,
  });

export const auditForceSubmit = (
  actorId: string,
  actorRole: string,
  examId: string,
  sessionCount: number,
  req: Request
) =>
  logAudit({
    actor_id: actorId,
    actor_role: actorRole,
    action: "force_submit_exam",
    resource_type: "exam",
    resource_id: examId,
    details: { session_count: sessionCount },
    ip_address: getClientIp(req),
    user_agent: req.headers["user-agent"] ?? null,
  });
