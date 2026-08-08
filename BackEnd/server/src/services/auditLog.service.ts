import {
  insertAuditLog,
  queryAuditLogs,
  AuditAction,
  AuditLogFilter,
} from "~/models/auditLog.model";

export const logAudit = async (
  payload: {
    actor_id?: string | null;
    actor_role?: string | null;
    action: AuditAction;
    resource_type?: string | null;
    resource_id?: string | null;
    details?: Record<string, unknown>;
    ip_address?: string | null;
    user_agent?: string | null;
  }
) => {
  try {
    return await insertAuditLog(payload);
  } catch (err) {
    console.error("[audit] failed to insert audit log:", err);
  }
};

export const getAuditLogsService = async (filter: AuditLogFilter) => {
  return queryAuditLogs(filter);
};
