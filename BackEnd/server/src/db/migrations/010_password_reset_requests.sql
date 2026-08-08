-- Reset Password Request flow
-- User requests password reset -> admin approves -> user sets new password

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES accounts(id),  -- who requested (admin or self)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    admin_note TEXT,
    approved_by UUID REFERENCES accounts(id),
    new_password_plain TEXT,  -- temporary, cleared after use
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_requests(expires_at);
