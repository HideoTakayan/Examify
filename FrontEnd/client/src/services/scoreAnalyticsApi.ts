import apiClient from './apiClient';

export type ScoreBucket = {
  range_label: string;
  min_grade10: number;
  max_grade10: number;
  count: number;
};

export type SubjectOption = {
  subject_id: string;
  subject_name: string;
  session_count: number;
};

export type ExamScoreStat = {
  exam_id: string;
  exam_title: string;
  submitted_count: number;
  avg_grade10: number | null;
  min_grade10: number | null;
  max_grade10: number | null;
  pass_rate: number | null;
};

export type SubjectScoreAnalytics = {
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
};

const scoreAnalyticsApi = {
  getSubjects: async (adminClassId?: string | null): Promise<SubjectOption[]> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectOption[] }>(
      '/score-analytics/subjects',
      {
        params: adminClassId ? { admin_class_id: adminClassId } : undefined,
      }
    );
    return res.data.data ?? [];
  },

  getBySubject: async (
    subjectId: string,
    adminClassId?: string | null
  ): Promise<SubjectScoreAnalytics> => {
    const res = await apiClient.get<{ success: boolean; data: SubjectScoreAnalytics }>(
      '/score-analytics/by-subject',
      {
        params: {
          subject_id: subjectId,
          ...(adminClassId ? { admin_class_id: adminClassId } : {}),
        },
      }
    );
    return res.data.data;
  },
};

export default scoreAnalyticsApi;
