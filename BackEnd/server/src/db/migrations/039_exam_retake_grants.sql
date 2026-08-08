-- GV cấp quyền thi lại; phiên cũ voided, phiên mới official.

CREATE TABLE IF NOT EXISTS exam_retake_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES accounts(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'consumed', 'revoked')),
  superseded_session_id UUID REFERENCES exam_sessions(id) ON DELETE SET NULL,
  consumed_session_id UUID REFERENCES exam_sessions(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retake_grants_exam_student
  ON exam_retake_grants(exam_id, student_id);

CREATE INDEX IF NOT EXISTS idx_retake_grants_status
  ON exam_retake_grants(exam_id, student_id, status);

ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES exam_sessions(id) ON DELETE SET NULL;
ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS retake_grant_id UUID REFERENCES exam_retake_grants(id) ON DELETE SET NULL;
