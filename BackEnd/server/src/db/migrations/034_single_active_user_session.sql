-- At most one active session per account (enforces single-browser login)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM user_sessions
  WHERE is_active = true AND expires_at > NOW()
)
UPDATE user_sessions us
SET is_active = false
FROM ranked r
WHERE us.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_one_active_per_user
  ON user_sessions (user_id)
  WHERE is_active = true;
