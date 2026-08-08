import {
  getStudentDashboardStats,
  getStudentUpcomingExams,
  getStudentRecentSessions,
  getClassAvgScale10ByExamIds,
  scoreToScale10,
  getActiveExamIdsForStudent,
  getAdminOverview,
  getTeacherOverview,
  getRecentStudents,
  getTeacherRecentStudents,
  countAdminDashboardActivity,
  countTeacherDashboardActivity,
  listAdminDashboardActivity,
  listTeacherDashboardActivity,
  type DashboardActivityFilters,
} from "~/models/dashboard.model";
import { isPastClosesAt } from "~/utils/examStartDeadline";
import { buildPaginatedList, type PaginationQuery } from "~/utils/pagination";
import type { UserRole } from "~/models/user.model";

export type TrendDirection = "up" | "down" | "flat";

export interface DashboardStatCard {
  key: string;
  value: string;
  /** 0–100 hoặc null nếu không tính được */
  numeric_hint: number | null;
  trend: TrendDirection;
}

export interface StudentUpcomingExamDto {
  exam_id: string;
  subject: string;
  date_label: string;
  time_label: string;
  duration_min: number;
  questions: number;
  badge: "soon" | "normal" | "active";
  countdown_days: number | null;
  can_start: boolean;
}

export interface PerformancePointDto {
  label: string;
  score: number;
  class_avg: number | null;
}

export interface RecentResultDto {
  exam_id: string;
  subject: string;
  date_iso: string;
  score_percent: number | null;
  time_used_min: number | null;
  time_total_min: number;
  level: "excellent" | "good" | "fair" | "poor";
}

export interface StudentDashboardDto {
  stats: DashboardStatCard[];
  upcoming_exams: StudentUpcomingExamDto[];
  performance_chart: PerformancePointDto[];
  recent_results: RecentResultDto[];
}

export interface StaffMetricDto {
  key: string;
  label_key: string;
  value: number;
}

export interface StaffRecentStudentDto {
  id: string;
  full_name: string | null;
  username: string;
  email: string;
}

export interface StaffRecentActivityDto {
  session_id: string;
  exam_title: string;
  student_name: string | null;
  student_email: string | null;
  status: string;
  updated_at: string;
}

export interface StaffDashboardDto {
  viewer: "admin" | "teacher";
  metrics: StaffMetricDto[];
  recent_students: StaffRecentStudentDto[];
}

export interface DashboardEnvelope {
  viewer_role: UserRole;
  student: StudentDashboardDto | null;
  staff: StaffDashboardDto | null;
}

function scoreLevel(pct: number | null): RecentResultDto["level"] {
  if (pct == null || !Number.isFinite(pct)) return "fair";
  if (pct >= 85) return "excellent";
  if (pct >= 70) return "good";
  if (pct >= 50) return "fair";
  return "poor";
}

function formatDateParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("vi-VN"),
    time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function daysUntil(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - now.getTime()) / 86400000);
}

export const buildStudentDashboard = async (studentId: string): Promise<StudentDashboardDto> => {
  const now = new Date();
  const statsRow = await getStudentDashboardStats(studentId);
  const upcomingRows = await getStudentUpcomingExams(studentId, 12);
  const sessionRows = await getStudentRecentSessions(studentId, 40);
  const activeExamIds = await getActiveExamIdsForStudent(studentId);

  const stats: DashboardStatCard[] = [
    {
      key: "exams_taken",
      value: String(statsRow.exams_taken_total),
      numeric_hint: statsRow.exams_taken_total,
      trend: "flat",
    },
    {
      key: "average_score",
      value:
        statsRow.average_score_percent != null && Number.isFinite(statsRow.average_score_percent)
          ? statsRow.average_score_percent.toFixed(1)
          : "—",
      numeric_hint:
        statsRow.average_score_percent != null && Number.isFinite(statsRow.average_score_percent)
          ? statsRow.average_score_percent
          : null,
      trend: "flat",
    },
    {
      key: "avg_time",
      value:
        statsRow.average_duration_minutes != null &&
        Number.isFinite(statsRow.average_duration_minutes)
          ? `${Math.round(statsRow.average_duration_minutes)}′`
          : "—",
      numeric_hint:
        statsRow.average_duration_minutes != null &&
        Number.isFinite(statsRow.average_duration_minutes)
          ? statsRow.average_duration_minutes
          : null,
      trend: "flat",
    },
    {
      key: "class_rank",
      value: "—",
      numeric_hint: null,
      trend: "flat",
    },
  ];

  const upcoming_exams: StudentUpcomingExamDto[] = upcomingRows.map((row) => {
    const hasActive = activeExamIds.has(row.exam_id);
    const closes = row.closes_at;
    const pastStart = closes ? isPastClosesAt(closes, now.getTime()) : false;
    const can_start = hasActive || !pastStart;
    const cd = daysUntil(closes, now);
    let badge: StudentUpcomingExamDto["badge"] = "normal";
    if (hasActive) badge = "active";
    else if (cd != null && cd >= 0 && cd <= 3) badge = "soon";

    const createdParts = formatDateParts(row.created_at);

    return {
      exam_id: row.exam_id,
      subject: row.subject_name || row.title,
      date_label: closes ? formatDateParts(closes).date : createdParts.date,
      time_label: closes ? formatDateParts(closes).time : createdParts.time,
      duration_min: row.duration_min,
      questions: row.question_count,
      badge,
      countdown_days: cd,
      can_start,
    };
  });

  const byExam = new Map<string, (typeof sessionRows)[0]>();
  for (const s of sessionRows) {
    if (!byExam.has(s.exam_id)) byExam.set(s.exam_id, s);
  }
  const uniqueSessions = [...byExam.values()].slice(0, 10);
  const examIds = uniqueSessions.map((s) => s.exam_id);
  const classAvgMap = await getClassAvgScale10ByExamIds(examIds);

  const performance_chart: PerformancePointDto[] = uniqueSessions.map((s) => {
    const scale10 = scoreToScale10(
      s.score != null ? Number(s.score) : null,
      s.max_points != null ? Number(s.max_points) : null
    );
    const raw = (s.subject_name || s.exam_title || '').trim();
    const label = raw.length > 22 ? `${raw.slice(0, 21)}…` : raw;
    const classAvg = classAvgMap.get(s.exam_id) ?? null;
    return {
      label,
      score: scale10 ?? 0,
      class_avg: classAvg != null && Number.isFinite(classAvg) ? Math.round(classAvg * 10) / 10 : null,
    };
  });

  const recent_results: RecentResultDto[] = sessionRows.slice(0, 8).map((s) => {
    const pct =
      s.max_points != null && s.max_points > 0 && s.score != null
        ? (Number(s.score) / Number(s.max_points)) * 100
        : null;
    let timeUsed: number | null = null;
    if (s.submitted_at) {
      const ms = new Date(s.submitted_at).getTime() - new Date(s.started_at).getTime();
      if (Number.isFinite(ms) && ms >= 0) timeUsed = Math.round(ms / 60000);
    }
    return {
      exam_id: s.exam_id,
      subject: s.subject_name || s.exam_title,
      date_iso: s.submitted_at || s.started_at,
      score_percent: pct,
      time_used_min: timeUsed,
      time_total_min: s.exam_duration_min ?? 60,
      level: scoreLevel(pct),
    };
  });

  return { stats, upcoming_exams, performance_chart, recent_results };
};

export const buildStaffDashboard = async (
  userId: string,
  role: "admin" | "teacher"
): Promise<StaffDashboardDto> => {
  if (role === "admin") {
    const o = await getAdminOverview();
    const recent_students = (await getRecentStudents(15)).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      username: r.username,
      email: r.email,
    }));
    return {
      viewer: "admin",
      metrics: [
        { key: "accounts", label_key: "dashboard.metric.accounts", value: o.total_accounts },
        { key: "students", label_key: "dashboard.metric.students", value: o.total_students },
        { key: "teachers", label_key: "dashboard.metric.teachers", value: o.total_teachers },
        { key: "exams", label_key: "dashboard.metric.exams", value: o.total_exams },
        { key: "sessions", label_key: "dashboard.metric.sessions", value: o.total_sessions },
        { key: "classes", label_key: "dashboard.metric.classes", value: o.total_classes },
      ],
      recent_students,
    };
  }

  const o = await getTeacherOverview(userId);
  const recent_students = (await getTeacherRecentStudents(userId, 10)).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    username: r.username,
    email: r.email,
  }));
  return {
    viewer: "teacher",
    metrics: [
      { key: "classes", label_key: "dashboard.metric.my_classes", value: o.total_classes },
      { key: "exams", label_key: "dashboard.metric.my_exams", value: o.total_exams },
      { key: "students", label_key: "dashboard.metric.my_students", value: o.total_students },
      { key: "sessions", label_key: "dashboard.metric.my_sessions", value: o.total_sessions },
    ],
    recent_students,
  };
};

export const listDashboardActivityForUser = async (
  userId: string,
  role: "admin" | "teacher",
  pagination: PaginationQuery,
  filters: DashboardActivityFilters
) => {
  const total =
    role === "admin"
      ? await countAdminDashboardActivity(filters)
      : await countTeacherDashboardActivity(userId, filters);
  const rows =
    role === "admin"
      ? await listAdminDashboardActivity(pagination.limit, pagination.offset, filters)
      : await listTeacherDashboardActivity(userId, pagination.limit, pagination.offset, filters);
  const items: StaffRecentActivityDto[] = rows.map((r) => ({
    session_id: r.session_id,
    exam_title: r.exam_title,
    student_name: r.student_name,
    student_email: r.student_email,
    status: r.status,
    updated_at: r.updated_at,
  }));
  return buildPaginatedList(items, total, pagination.limit, pagination.offset);
};

export const getDashboardForUser = async (
  userId: string,
  role: UserRole
): Promise<DashboardEnvelope> => {
  if (role === "student") {
    const student = await buildStudentDashboard(userId);
    return { viewer_role: "student", student, staff: null };
  }
  if (role === "admin" || role === "teacher") {
    const staff = await buildStaffDashboard(userId, role);
    return { viewer_role: role, student: null, staff };
  }
  return { viewer_role: role, student: null, staff: null };
};
