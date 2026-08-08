import pool from "~/config/db";

export interface AdminSystemReport {
  overview: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    total_sessions: number;
    total_classes: number;
  };
  session_stats: {
    total_submitted: number;
    total_active: number;
    total_expired: number;
    completion_rate: number;      // submitted / total
    pass_rate: number;            // score >= 60% / submitted
    avg_score: number | null;
  };
  integrity_stats: {
    violations_last_24h: number;
    top_violation_type: string | null;
    flagged_sessions: number;
  };
  pending_grading: number;
  recent_exams: Array<{
    exam_id: string;
    title: string;
    opens_at: string | null;
    ends_at: string | null;
    active_sessions: number;
    submitted_today: number;
  }>;
}

export const getAdminSystemReport = async (): Promise<AdminSystemReport> => {
  // Overview
  const overviewRows = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM accounts WHERE role IN ('student', 'teacher')) AS total_accounts,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'student') AS total_students,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'teacher') AS total_teachers,
      (SELECT COUNT(*)::int FROM exams WHERE title NOT ILIKE 'E2E Exam%') AS total_exams,
      (SELECT COUNT(*)::int FROM exam_sessions es
         JOIN exams e ON e.id = es.exam_id
         WHERE e.title NOT ILIKE 'E2E Exam%') AS total_sessions,
      (SELECT COUNT(*)::int FROM classes) AS total_classes
  `);

  // Session stats
  const sessionRows = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE es.status = 'submitted')::int AS total_submitted,
      COUNT(*) FILTER (WHERE es.status = 'active')::int AS total_active,
      COUNT(*) FILTER (WHERE es.status = 'expired')::int AS total_expired,
      ROUND(
        COUNT(*) FILTER (WHERE es.status = 'submitted')::numeric /
        NULLIF(COUNT(*)::numeric, 0) * 100, 1
      ) AS completion_rate,
      ROUND(
        COUNT(*) FILTER (
          WHERE es.status = 'submitted'
            AND es.max_points > 0
            AND es.score IS NOT NULL
            AND (es.score / es.max_points * 100) >= 60
        )::numeric /
        NULLIF(COUNT(*) FILTER (WHERE es.status = 'submitted')::numeric, 0) * 100, 1
      ) AS pass_rate,
      AVG(
        CASE WHEN es.status = 'submitted' AND es.max_points > 0 AND es.score IS NOT NULL
          THEN (es.score / es.max_points * 100)
          ELSE NULL
        END
      )::float AS avg_score
    FROM exam_sessions es
    INNER JOIN exams e ON e.id = es.exam_id AND e.title NOT ILIKE 'E2E Exam%'
  `);

  // Integrity stats (last 24h)
  const integrityRows = await pool.query(`
    SELECT
      COUNT(*)::int AS violations_last_24h,
      MODE() WITHIN GROUP (ORDER BY event_type) AS top_violation_type
    FROM exam_integrity_events
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);

  // Pending grading
  const gradingRows = await pool.query(`
    SELECT COUNT(*)::int AS pending_grading
    FROM exam_sessions es
    INNER JOIN exams e ON e.id = es.exam_id AND e.title NOT ILIKE 'E2E Exam%'
    WHERE es.grading_status = 'pending_manual'
  `);

  // Upcoming exams (chưa hết hạn), sắp theo giờ mở / hạn — không sort theo created_at
  const upcomingExamRows = await pool.query(`
    SELECT
      e.id AS exam_id,
      e.title,
      e.opens_at,
      COALESCE(e.ends_at, e.closes_at) AS ends_at,
      COUNT(es.id) FILTER (WHERE es.status = 'active') AS active_sessions,
      COUNT(es.id) FILTER (
        WHERE es.status = 'submitted'
          AND es.submitted_at > NOW() - INTERVAL '24 hours'
      ) AS submitted_today
    FROM exams e
    LEFT JOIN exam_sessions es ON es.exam_id = e.id
    WHERE
      e.title NOT ILIKE 'E2E Exam%'
      AND (
        COALESCE(e.ends_at, e.closes_at) IS NULL
        OR COALESCE(e.ends_at, e.closes_at) > NOW()
      )
    GROUP BY e.id, e.title, e.opens_at, e.closes_at, e.ends_at, e.created_at
    ORDER BY
      (CASE WHEN COALESCE(e.opens_at, e.closes_at, e.ends_at) IS NULL THEN 1 ELSE 0 END),
      COALESCE(e.opens_at, e.closes_at, e.ends_at) ASC,
      e.created_at DESC
    LIMIT 10
  `);

  const sr = sessionRows.rows[0];
  const ir = integrityRows.rows[0];

  return {
    overview: overviewRows.rows[0] ?? {
      total_accounts: 0, total_students: 0, total_teachers: 0,
      total_exams: 0, total_sessions: 0, total_classes: 0,
    },
    session_stats: {
      total_submitted: sr.total_submitted ?? 0,
      total_active: sr.total_active ?? 0,
      total_expired: sr.total_expired ?? 0,
      completion_rate: Number(sr.completion_rate ?? 0),
      pass_rate: Number(sr.pass_rate ?? 0),
      avg_score: sr.avg_score ?? null,
    },
    integrity_stats: {
      violations_last_24h: ir?.violations_last_24h ?? 0,
      top_violation_type: ir?.top_violation_type ?? null,
      flagged_sessions: 0,
    },
    pending_grading: gradingRows.rows[0]?.pending_grading ?? 0,
    recent_exams: upcomingExamRows.rows.map((r) => ({
      exam_id: r.exam_id,
      title: r.title,
      opens_at: r.opens_at ?? null,
      ends_at: r.ends_at ?? null,
      active_sessions: Number(r.active_sessions ?? 0),
      submitted_today: Number(r.submitted_today ?? 0),
    })),
  };
};
