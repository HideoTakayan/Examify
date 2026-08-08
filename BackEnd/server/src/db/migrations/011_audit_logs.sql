-- Audit Log: tracks important system events for compliance and debugging
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,                          -- who performed the action (null for system)
    actor_role TEXT,                        -- admin / teacher / student / system
    action TEXT NOT NULL,                   -- e.g. 'login', 'submit_exam', 'grading', 'create_account'
    resource_type TEXT,                     -- e.g. 'exam_session', 'account', 'exam'
    resource_id UUID,                       -- id of the affected resource
    details JSONB DEFAULT '{}',             -- extra context
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at DESC);
