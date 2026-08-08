import apiClient from './apiClient';
import { fetchPaginatedList, type ListQueryParams, type PaginatedList } from './listApi';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface DashboardStatCard {
  key: string;
  value: string;
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
  badge: 'soon' | 'normal' | 'active';
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
  level: 'excellent' | 'good' | 'fair' | 'poor';
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
  viewer: 'admin' | 'teacher';
  metrics: StaffMetricDto[];
  recent_students: StaffRecentStudentDto[];
}

export type DashboardActivityQuery = ListQueryParams & {
  status?: string;
  keyword?: string;
  time?: string;
};

export interface DashboardEnvelope {
  viewer_role: 'admin' | 'teacher' | 'student';
  student: StudentDashboardDto | null;
  staff: StaffDashboardDto | null;
}

const dashboardApi = {
  get: async (): Promise<DashboardEnvelope> => {
    const res = await apiClient.get<{ success: boolean; data: DashboardEnvelope }>('/dashboard');
    return res.data.data;
  },

  listActivity: async (params: DashboardActivityQuery = {}): Promise<PaginatedList<StaffRecentActivityDto>> =>
    fetchPaginatedList<StaffRecentActivityDto>('/dashboard/activity', params),
};

export default dashboardApi;
