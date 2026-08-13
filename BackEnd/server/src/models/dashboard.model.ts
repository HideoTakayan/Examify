import pool from "~/config/db";

/** Cache: DB production có thể chưa migration `exams.closes_at`. */
let cachedExamsHasClosesAt: boolean | null = null;

export async function examsTableHasClosesAt(): Promise<boolean> {
  if (cachedExamsHasClosesAt !== null) return cachedExamsHasClosesAt;
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'closes_at'
     LIMIT 1`
  );
  cachedExamsHasClosesAt = r.rows.length > 0;
  return cachedExamsHasClosesAt;
}

export interface StudentDashboardStatsRow {
  exams_taken_total: number;
  average_score_percent: number | null;
  average_duration_minutes: number | null;
}

export interface StudentUpcomingExamRow {
  exam_id: string;
  title: string;
  subject_name: string;
  duration_min: number;
  question_count: number;
  closes_at: string | null;
  created_at: string;
}

export interface StudentSessionSummaryRow {
  exam_id: string;
  exam_title: string;
  subject_name: string;
  exam_duration_min: number;
  submitted_at: string | null;
  started_at: string;
  score: number | null;
  max_points: number | null;
  status: string;
}

export const getStudentDashboardStats = async (
  studentId: string
): Promise<StudentDashboardStatsRow> => {
  const r = await pool.query<StudentDashboardStatsRow>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'submitted')::int AS exams_taken_total,
      AVG(
        CASE
          WHEN status = 'submitted' AND max_points IS NOT NULL AND max_points > 0 AND score IS NOT NULL
          THEN (score / max_points) * 100
        END
      )::float AS average_score_percent,
      AVG(
        CASE
          WHEN submitted_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) / 60.0
        END
      )::float AS average_duration_minutes
    FROM exam_sessions
    WHERE student_id = $1
    `,
    [studentId]
  );
  return (
    r.rows[0] ?? {
      exams_taken_total: 0,
      average_score_percent: null,
      average_duration_minutes: null,
    }
  );
};

export const getStudentUpcomingExams = async (
  studentId: string,
  limit = 12
): Promise<StudentUpcomingExamRow[]> => {
  const hasDeadline = await examsTableHasClosesAt();
  const studentExamScope = `
    FROM exams e
    JOIN accounts acc ON acc.id = $1
    LEFT JOIN classes c ON c.id = e.class_id
    LEFT JOIN subjects s ON s.id = COALESCE(e.subject_id, c.subject_id)
    WHERE (
      e.admin_class_id IS NOT NULL AND e.admin_class_id = acc.admin_class_id
    ) OR (
      e.class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM term_student_enrollments tse
        WHERE tse.term_offering_id = e.class_id AND tse.student_id = acc.id
      )
    ) OR (
      e.class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM enrollments en
        WHERE en.class_id = e.class_id AND en.student_id = acc.id
      )
    )
  `;
  const sqlWithDeadline = `
    SELECT
      e.id AS exam_id,
      e.title,
      s.name AS subject_name,
      e.duration_min,
      COALESCE(
        (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.id),
        0
      ) AS question_count,
      e.closes_at,
      e.created_at
    ${studentExamScope}
    ORDER BY e.closes_at ASC NULLS LAST, e.created_at DESC
    LIMIT $2
  `;
  const sqlWithoutDeadline = `
    SELECT
      e.id AS exam_id,
      e.title,
      s.name AS subject_name,
      e.duration_min,
      COALESCE(
        (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.id),
        0
      ) AS question_count,
      NULL::timestamptz AS closes_at,
      e.created_at
    ${studentExamScope}
    ORDER BY e.created_at DESC
    LIMIT $2
  `;
  const r = await pool.query<StudentUpcomingExamRow>(
    hasDeadline ? sqlWithDeadline : sqlWithoutDeadline,
    [studentId, limit]
  );
  return r.rows;
};

/** Phiên đã nộp / hết hạn, mới nhất trước — dùng cho biểu đồ & bảng kết quả */
export const getStudentRecentSessions = async (
  studentId: string,
  limit = 24
): Promise<StudentSessionSummaryRow[]> => {
  const r = await pool.query<StudentSessionSummaryRow>(
    `
    SELECT
      e.id AS exam_id,
      e.title AS exam_title,
      s.name AS subject_name,
      e.duration_min AS exam_duration_min,
      es.submitted_at,
      es.started_at,
      es.score,
      es.max_points,
      es.status
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    LEFT JOIN classes c ON c.id = e.class_id
    LEFT JOIN subjects s ON s.id = COALESCE(e.subject_id, c.subject_id)
    WHERE es.student_id = $1
      AND es.status IN ('submitted', 'expired')
      AND es.voided_at IS NULL
    ORDER BY COALESCE(es.submitted_at, es.created_at) DESC
    LIMIT $2
    `,
    [studentId, limit]
  );
  return r.rows;
};

/** Quy đổi điểm thô sang thang 10 (hệ thống chấm thang 10). */
export function scoreToScale10(score: number | null, maxPoints: number | null): number | null {
  if (score == null || maxPoints == null || maxPoints <= 0) return null;
  const v = (Number(score) / Number(maxPoints)) * 10;
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

/** TB thang 10 của mọi SV đã nộp bài trên cùng một đợt thi (exam_id). */
export const getClassAvgScale10ByExamIds = async (
  examIds: string[]
): Promise<Map<string, number>> => {
  if (examIds.length === 0) return new Map();
  const r = await pool.query<{ exam_id: string; class_avg_scale10: number }>(
    `
    SELECT
      exam_id::text,
      AVG(
        CASE
          WHEN max_points IS NOT NULL AND max_points > 0 AND score IS NOT NULL
          THEN (score / max_points) * 10
        END
      )::float AS class_avg_scale10
    FROM exam_sessions
    WHERE exam_id = ANY($1::uuid[])
      AND status = 'submitted'
      AND voided_at IS NULL
    GROUP BY exam_id
    `,
    [examIds]
  );
  const m = new Map<string, number>();
  for (const row of r.rows) {
    if (row.class_avg_scale10 != null && Number.isFinite(row.class_avg_scale10)) {
      m.set(row.exam_id, row.class_avg_scale10);
    }
  }
  return m;
};

export const getActiveExamIdsForStudent = async (studentId: string): Promise<Set<string>> => {
  const r = await pool.query<{ exam_id: string }>(
    `SELECT exam_id::text FROM exam_sessions WHERE student_id = $1 AND status = 'active'`,
    [studentId]
  );
  return new Set(r.rows.map((x) => x.exam_id));
};

export interface StaffOverviewRow {
  total_accounts: number;
  total_students: number;
  total_teachers: number;
  total_exams: number;
  total_sessions: number;
  total_classes: number;
}

export const getAdminOverview = async (): Promise<StaffOverviewRow> => {
  const r = await pool.query<StaffOverviewRow>(
    `
    SELECT
      (SELECT COUNT(*)::int FROM accounts WHERE role IN ('student', 'teacher')) AS total_accounts,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'student') AS total_students,
      (SELECT COUNT(*)::int FROM accounts WHERE role = 'teacher') AS total_teachers,
      (SELECT COUNT(*)::int FROM exams) AS total_exams,
      (SELECT COUNT(*)::int FROM exam_sessions WHERE voided_at IS NULL) AS total_sessions,
      (SELECT COUNT(*)::int FROM classes) AS total_classes
    `
  );
  return (
    r.rows[0] ?? {
      total_accounts: 0,
      total_students: 0,
      total_teachers: 0,
      total_exams: 0,
      total_sessions: 0,
      total_classes: 0,
    }
  );
};

/** Đề thi thuộc phạm vi GV: chủ nhiệm lớp HC, người tạo, hoặc cộng tác viên. */
const TEACHER_EXAM_SCOPE_SQL = `
  e.created_by = $1
  OR EXISTS (
    SELECT 1 FROM admin_classes ac
    WHERE ac.id = e.admin_class_id AND ac.manager_teacher_id = $1
  )
  OR EXISTS (
    SELECT 1 FROM exam_collaborators ec
    WHERE ec.exam_id = e.id AND ec.teacher_id = $1
  )
  OR EXISTS (
    SELECT 1 FROM term_teacher_registrations tr
    WHERE tr.term_offering_id = e.class_id AND tr.teacher_id = $1
  )
  OR EXISTS (
    SELECT 1 FROM exam_shares esh
    WHERE esh.exam_id = e.id AND esh.shared_with = $1
  )
`;

export const getTeacherOverview = async (teacherId: string): Promise<StaffOverviewRow> => {
  const r = await pool.query<StaffOverviewRow>(
    `
    SELECT
      (
        (SELECT COUNT(*)::int FROM admin_classes WHERE manager_teacher_id = $1) +
        (SELECT COUNT(*)::int FROM term_teacher_registrations WHERE teacher_id = $1)
      ) AS total_classes,
      (SELECT COUNT(*)::int FROM exams e WHERE ${TEACHER_EXAM_SCOPE_SQL}) AS total_exams,
      (SELECT COUNT(DISTINCT s.id)::int 
       FROM accounts s
       LEFT JOIN admin_classes ac ON ac.id = s.admin_class_id
       LEFT JOIN term_student_enrollments tse ON tse.student_id = s.id
       LEFT JOIN term_teacher_registrations tr ON tr.term_offering_id = tse.term_offering_id
       WHERE s.role = 'student'
         AND (ac.manager_teacher_id = $1 OR tr.teacher_id = $1)
      ) AS total_students,
      (SELECT COUNT(*)::int FROM exam_sessions es
        WHERE es.voided_at IS NULL AND es.exam_id IN (SELECT e.id FROM exams e WHERE ${TEACHER_EXAM_SCOPE_SQL})) AS total_sessions,
      0::int AS total_accounts,
      0::int AS total_teachers
    `,
    [teacherId]
  );
  const row = r.rows[0];
  if (!row) {
    return {
      total_accounts: 0,
      total_students: 0,
      total_teachers: 0,
      total_exams: 0,
      total_sessions: 0,
      total_classes: 0,
    };
  }
  return row;
};

export interface RecentStudentRow {
  id: string;
  full_name: string | null;
  username: string;
  email: string;
  created_at: string;
}

export const getRecentStudents = async (limit = 15): Promise<RecentStudentRow[]> => {
  const r = await pool.query<RecentStudentRow>(
    `
    SELECT id, full_name, username, email, created_at::text
    FROM accounts
    WHERE role = 'student'
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return r.rows;
};

export interface TeacherRecentSessionRow {
  session_id: string;
  exam_title: string;
  student_name: string | null;
  student_email: string | null;
  status: string;
  updated_at: string;
}

export interface DashboardActivityFilters {
  status?: string;
  keyword?: string;
  time?: string;
}

const ACTIVITY_UPDATED_EXPR = `COALESCE(es.submitted_at, es.started_at, es.created_at)`;

function buildActivityFilterSql(
  filters: DashboardActivityFilters,
  startParamIdx: number
): { sql: string; params: unknown[]; nextIdx: number } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = startParamIdx;

  const status = filters.status?.trim();
  if (status && status !== "all") {
    clauses.push(`es.status = $${idx++}`);
    params.push(status);
  }

  const keyword = filters.keyword?.trim();
  if (keyword) {
    clauses.push(
      `(e.title ILIKE $${idx} OR a.full_name ILIKE $${idx} OR a.email ILIKE $${idx})`
    );
    params.push(`%${keyword}%`);
    idx += 1;
  }

  const time = filters.time?.trim();
  if (time && time !== "all") {
    const days = time === "7d" ? 7 : time === "30d" ? 30 : 90;
    clauses.push(`${ACTIVITY_UPDATED_EXPR} >= NOW() - ($${idx++}::int * INTERVAL '1 day')`);
    params.push(days);
  }

  const sql = clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "";
  return { sql, params, nextIdx: idx };
}

const activitySelectSql = `
  SELECT
    es.id::text AS session_id,
    e.title AS exam_title,
    a.full_name AS student_name,
    a.email AS student_email,
    es.status,
    ${ACTIVITY_UPDATED_EXPR}::text AS updated_at
  FROM exam_sessions es
  JOIN exams e ON e.id = es.exam_id
  JOIN accounts a ON a.id = es.student_id
`;

export const countTeacherDashboardActivity = async (
  teacherId: string,
  filters: DashboardActivityFilters = {}
): Promise<number> => {
  const { sql: filterSql, params: filterParams, nextIdx } = buildActivityFilterSql(filters, 2);
  const r = await pool.query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    JOIN accounts a ON a.id = es.student_id
    WHERE es.voided_at IS NULL AND (${TEACHER_EXAM_SCOPE_SQL})${filterSql}
    `,
    [teacherId, ...filterParams]
  );
  void nextIdx;
  return r.rows[0]?.total ?? 0;
};

export const listTeacherDashboardActivity = async (
  teacherId: string,
  limit: number,
  offset: number,
  filters: DashboardActivityFilters = {}
): Promise<TeacherRecentSessionRow[]> => {
  const { sql: filterSql, params: filterParams, nextIdx } = buildActivityFilterSql(filters, 2);
  const limitIdx = nextIdx;
  const offsetIdx = nextIdx + 1;
  const r = await pool.query<TeacherRecentSessionRow>(
    `
    ${activitySelectSql}
    WHERE es.voided_at IS NULL AND (${TEACHER_EXAM_SCOPE_SQL})${filterSql}
    ORDER BY ${ACTIVITY_UPDATED_EXPR} DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    [teacherId, ...filterParams, limit, offset]
  );
  return r.rows;
};

export const countAdminDashboardActivity = async (
  filters: DashboardActivityFilters = {}
): Promise<number> => {
  const { sql: filterSql, params: filterParams } = buildActivityFilterSql(filters, 1);
  const r = await pool.query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    JOIN accounts a ON a.id = es.student_id
    WHERE es.voided_at IS NULL${filterSql}
    `,
    filterParams
  );
  return r.rows[0]?.total ?? 0;
};

export const listAdminDashboardActivity = async (
  limit: number,
  offset: number,
  filters: DashboardActivityFilters = {}
): Promise<TeacherRecentSessionRow[]> => {
  const { sql: filterSql, params: filterParams, nextIdx } = buildActivityFilterSql(filters, 1);
  const limitIdx = nextIdx;
  const offsetIdx = nextIdx + 1;
  const r = await pool.query<TeacherRecentSessionRow>(
    `
    ${activitySelectSql}
    WHERE es.voided_at IS NULL${filterSql}
    ORDER BY ${ACTIVITY_UPDATED_EXPR} DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    [...filterParams, limit, offset]
  );
  return r.rows;
};

export const getTeacherRecentSessions = async (
  teacherId: string,
  limit = 12
): Promise<TeacherRecentSessionRow[]> => listTeacherDashboardActivity(teacherId, limit, 0);

export const getTeacherRecentStudents = async (
  teacherId: string,
  limit = 10
): Promise<RecentStudentRow[]> => {
  const r = await pool.query<RecentStudentRow>(
    `
    SELECT DISTINCT ON (a.id)
      a.id::text,
      a.full_name,
      a.username,
      a.email,
      a.created_at::text
    FROM accounts a
    WHERE a.role = 'student'
      AND a.admin_class_id IN (
        SELECT id FROM admin_classes WHERE manager_teacher_id = $1
      )
    ORDER BY a.id, a.full_name NULLS LAST, a.email
    LIMIT $2
    `,
    [teacherId, limit]
  );
  return r.rows;
};

export const getAdminRecentSessions = async (limit = 12): Promise<TeacherRecentSessionRow[]> =>
  listAdminDashboardActivity(limit, 0);
