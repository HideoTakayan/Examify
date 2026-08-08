-- Password Reset Token — self-service email-based reset flow
-- User requests reset → token created → email sent with link → user clicks link → reset

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token       VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    used        BOOLEAN NOT NULL DEFAULT false,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token    ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens(expires_at);

COMMENT ON TABLE password_reset_tokens IS
    'Self-service password reset via email link — token scoped to one-time use';