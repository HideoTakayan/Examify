import pool from "~/config/db";

export type AuditAction =
  | "login"
  | "logout"
  | "create_account"
  | "delete_account"
  | "update_account"
  | "create_exam"
  | "delete_exam"
  | "update_exam"
  | "start_exam"
  | "submit_exam"
  | "force_submit_exam"
  | "grading"
  | "grade_session"
  | "create_question"
  | "delete_question"
  | "password_reset_request"
  | "password_reset_approve"
  | "password_reset_reject"
  | "system_event";

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: AuditAction;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogWithActor extends AuditLog {
  actor_name: string | null;
  actor_email: string | null;
}

export interface AuditLogFilter {
  actor_id?: string;
  action?: AuditAction;
  resource_type?: string;
  resource_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export const insertAuditLog = async (payload: {
  actor_id?: string | null;
  actor_role?: string | null;
  action: AuditAction;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}): Promise<AuditLog> => {
  const result = await pool.query(
    `INSERT INTO audit_logs
       (actor_id, actor_role, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      payload.actor_id ?? null,
      payload.actor_role ?? null,
      payload.action,
      payload.resource_type ?? null,
      payload.resource_id ?? null,
      JSON.stringify(payload.details ?? {}),
      payload.ip_address ?? null,
      payload.user_agent ?? null,
    ]
  );
  return result.rows[0] as AuditLog;
};

export const queryAuditLogs = async (filter: AuditLogFilter): Promise<{
  logs: AuditLogWithActor[];
  total: number;
}> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filter.actor_id) {
    conditions.push(`al.actor_id = $${idx++}`);
    values.push(filter.actor_id);
  }
  if (filter.action) {
    conditions.push(`al.action = $${idx++}`);
    values.push(filter.action);
  }
  if (filter.resource_type) {
    conditions.push(`al.resource_type = $${idx++}`);
    values.push(filter.resource_type);
  }
  if (filter.resource_id) {
    conditions.push(`al.resource_id = $${idx++}`);
    values.push(filter.resource_id);
  }
  if (filter.from_date) {
    conditions.push(`al.created_at >= $${idx++}`);
    values.push(filter.from_date);
  }
  if (filter.to_date) {
    conditions.push(`al.created_at <= $${idx++}`);
    values.push(filter.to_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM audit_logs al ${where}`,
    values
  );

  const dataResult = await pool.query<AuditLogWithActor>(
    `SELECT al.*,
            a.full_name AS actor_name,
            a.email AS actor_email
     FROM audit_logs al
     LEFT JOIN accounts a ON a.id = al.actor_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );

  return {
    logs: dataResult.rows as AuditLogWithActor[],
    total: countResult.rows[0]?.total ?? 0,
  };
};
