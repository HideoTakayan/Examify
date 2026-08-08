import pool from "~/config/db";

export interface ScoreDistributionBucket {
  exam_id: string;
  exam_title: string;
  total_students: number;
  avg_score: number | null;
  max_score: number | null;
  min_score: number | null;
  buckets: Array<{
    range_label: string;
    min_pct: number;
    max_pct: number;
    count: number;
  }>;
}

export interface ScoreBucket {
  range_label: string;
  min_grade10: number;
  max_grade10: number;
  count: number;
}

export interface SubjectOption {
  subject_id: string;
  subject_name: string;
  session_count: number;
}

export interface ExamScoreStat {
  exam_id: string;
  exam_title: string;
  submitted_count: number;
  avg_grade10: number | null;
  min_grade10: number | null;
  max_grade10: number | null;
  pass_rate: number | null;
}

export interface SubjectScoreAnalytics {
  admin_class_id: string | null;
  class_name: string;
  subject_id: string;
  subject_name: string;
  summary: {
    total_sessions: number;
    avg_grade10: number | null;
    min_grade10: number | null;
    max_grade10: number | null;
    pass_rate: number | null;
  };
  buckets: ScoreBucket[];
  exams: ExamScoreStat[];
}

const GRADE10_BUCKETS = [
  { range_label: "0-2", min_grade10: 0, max_grade10: 2 },
  { range_label: "2-4", min_grade10: 2, max_grade10: 4 },
  { range_label: "4-5", min_grade10: 4, max_grade10: 5 },
  { range_label: "5-6.5", min_grade10: 5, max_grade10: 6.5 },
  { range_label: "6.5-8", min_grade10: 6.5, max_grade10: 8 },
  { range_label: "8-10", min_grade10: 8, max_grade10: 10 },
];

const PASS_GRADE10 = 5;

function roundGrade10(value: number): number {
  return Math.round(value * 10) / 10;
}

function scoreToGrade10(score: number, maxPoints: number): number {
  return roundGrade10((score / maxPoints) * 10);
}

function buildGrade10Stats(grades: number[]) {
  const counts = new Array(GRADE10_BUCKETS.length).fill(0);
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;
  let passCount = 0;

  for (const grade of grades) {
    sum += grade;
    if (min == null || grade < min) min = grade;
    if (max == null || grade > max) max = grade;
    if (grade >= PASS_GRADE10) passCount++;

    let placed = false;
    for (let i = 0; i < GRADE10_BUCKETS.length; i++) {
      const b = GRADE10_BUCKETS[i];
      const isLast = i === GRADE10_BUCKETS.length - 1;
      if (grade >= b.min_grade10 && (isLast ? grade <= b.max_grade10 : grade < b.max_grade10)) {
        counts[i]++;
        placed = true;
        break;
      }
    }
    if (!placed && grade >= 10) counts[GRADE10_BUCKETS.length - 1]++;
  }

  const total = grades.length;
  return {
    buckets: GRADE10_BUCKETS.map((b, i) => ({ ...b, count: counts[i] })),
    avg_grade10: total > 0 ? roundGrade10(sum / total) : null,
    min_grade10: min,
    max_grade10: max,
    pass_rate: total > 0 ? roundGrade10((passCount / total) * 100) : null,
    total_sessions: total,
  };
}

const SESSIONS_BASE_SQL = `
  FROM exam_sessions es
  JOIN exams e ON e.id = es.exam_id
  JOIN accounts a ON a.id = es.student_id
  LEFT JOIN classes c ON c.id = e.class_id
  LEFT JOIN subjects s ON s.id = COALESCE(e.subject_id, c.subject_id)
  WHERE es.status = 'submitted'
    AND es.score IS NOT NULL
    AND es.max_points > 0
    AND es.voided_at IS NULL
    AND s.id IS NOT NULL
`;

function adminClassFilter(adminClassId: string | null, paramIdx: number): string {
  if (adminClassId) {
    return ` AND e.admin_class_id = $${paramIdx} AND a.admin_class_id = $${paramIdx}`;
  }
  return "";
}

export const getSubjectsForAdminClass = async (
  adminClassId: string | null
): Promise<SubjectOption[]> => {
  const params: unknown[] = [];
  let classClause = "";
  if (adminClassId) {
    params.push(adminClassId);
    classClause = adminClassFilter(adminClassId, 1);
  }

  const rows = await pool.query<{
    subject_id: string;
    subject_name: string;
    session_count: number;
  }>(
    `
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      COUNT(*)::int AS session_count
    ${SESSIONS_BASE_SQL}
    ${classClause}
    GROUP BY s.id, s.name
    HAVING COUNT(*) > 0
    ORDER BY s.name ASC
    `,
    params
  );

  return rows.rows;
};

export const getScoreAnalyticsBySubject = async (
  adminClassId: string | null,
  subjectId: string
): Promise<SubjectScoreAnalytics | null> => {
  const params: unknown[] = [subjectId];
  let classClause = "";
  if (adminClassId) {
    params.push(adminClassId);
    classClause = adminClassFilter(adminClassId, 2);
  }

  const subjectRow = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM subjects WHERE id = $1`,
    [subjectId]
  );
  if (!subjectRow.rows[0]) return null;

  let className = "Tất cả lớp";
  if (adminClassId) {
    const classRow = await pool.query<{ display_name: string }>(
      `SELECT display_name FROM admin_classes WHERE id = $1`,
      [adminClassId]
    );
    className = classRow.rows[0]?.display_name ?? className;
  }

  const sessionRows = await pool.query<{
    exam_id: string;
    exam_title: string;
    score: number;
    max_points: number;
  }>(
    `
    SELECT
      e.id AS exam_id,
      e.title AS exam_title,
      es.score::float AS score,
      es.max_points::float AS max_points
    ${SESSIONS_BASE_SQL}
      AND s.id = $1
    ${classClause}
    ORDER BY e.title ASC
    `,
    params
  );

  if (sessionRows.rows.length === 0) {
    return {
      admin_class_id: adminClassId,
      class_name: className,
      subject_id: subjectId,
      subject_name: subjectRow.rows[0].name,
      summary: {
        total_sessions: 0,
        avg_grade10: null,
        min_grade10: null,
        max_grade10: null,
        pass_rate: null,
      },
      buckets: GRADE10_BUCKETS.map((b) => ({ ...b, count: 0 })),
      exams: [],
    };
  }

  const allGrades = sessionRows.rows.map((r) => scoreToGrade10(r.score, r.max_points));
  const overall = buildGrade10Stats(allGrades);

  const byExam = new Map<
    string,
    { title: string; grades: number[] }
  >();
  for (const row of sessionRows.rows) {
    if (!byExam.has(row.exam_id)) {
      byExam.set(row.exam_id, { title: row.exam_title, grades: [] });
    }
    byExam.get(row.exam_id)!.grades.push(scoreToGrade10(row.score, row.max_points));
  }

  const exams: ExamScoreStat[] = Array.from(byExam.entries()).map(([exam_id, { title, grades }]) => {
    const stats = buildGrade10Stats(grades);
    return {
      exam_id,
      exam_title: title,
      submitted_count: stats.total_sessions,
      avg_grade10: stats.avg_grade10,
      min_grade10: stats.min_grade10,
      max_grade10: stats.max_grade10,
      pass_rate: stats.pass_rate,
    };
  });

  return {
    admin_class_id: adminClassId,
    class_name: className,
    subject_id: subjectId,
    subject_name: subjectRow.rows[0].name,
    summary: {
      total_sessions: overall.total_sessions,
      avg_grade10: overall.avg_grade10,
      min_grade10: overall.min_grade10,
      max_grade10: overall.max_grade10,
      pass_rate: overall.pass_rate,
    },
    buckets: overall.buckets,
    exams,
  };
};

/** @deprecated legacy endpoint */
export const getScoreDistributionByExam = async (
  examId: string
): Promise<ScoreDistributionBucket | null> => {
  const examRow = await pool.query(
    `SELECT e.id, e.title FROM exams e WHERE e.id = $1`,
    [examId]
  );
  if (!examRow.rows[0]) return null;

  const rows = await pool.query<{ score_pct: number | null }>(
    `SELECT
       CASE WHEN max_points > 0 AND score IS NOT NULL
         THEN (score / max_points) * 100
         ELSE NULL
       END AS score_pct
     FROM exam_sessions
     WHERE exam_id = $1 AND status = 'submitted'`,
    [examId]
  );

  const DEFAULT_BUCKETS = [
    { range_label: "0-20%", min_pct: 0, max_pct: 20 },
    { range_label: "20-40%", min_pct: 20, max_pct: 40 },
    { range_label: "40-60%", min_pct: 40, max_pct: 60 },
    { range_label: "60-80%", min_pct: 60, max_pct: 80 },
    { range_label: "80-100%", min_pct: 80, max_pct: 100 },
  ];

  const counts = new Array(DEFAULT_BUCKETS.length).fill(0);
  let total = 0;
  let sum = 0;
  let max: number | null = null;
  let min: number | null = null;

  for (const row of rows.rows) {
    if (row.score_pct == null) continue;
    total++;
    sum += row.score_pct;
    if (max == null || row.score_pct > max) max = row.score_pct;
    if (min == null || row.score_pct < min) min = row.score_pct;
    for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
      const b = DEFAULT_BUCKETS[i];
      const isLast = i === DEFAULT_BUCKETS.length - 1;
      if (
        row.score_pct >= b.min_pct
        && (isLast ? row.score_pct <= b.max_pct : row.score_pct < b.max_pct)
      ) {
        counts[i]++;
        break;
      }
    }
  }

  return {
    exam_id: examId,
    exam_title: examRow.rows[0].title,
    total_students: total,
    avg_score: total > 0 ? sum / total : null,
    max_score: max,
    min_score: min,
    buckets: DEFAULT_BUCKETS.map((b, i) => ({ ...b, count: counts[i] })),
  };
};
