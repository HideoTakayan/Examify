import apiClient from './apiClient';
import { fetchPaginatedList, type ListQueryParams, type PaginatedList } from './listApi';
import { unwrapPaginatedData } from '@/utils/pagination';

export interface StudentItem {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GradeRow {
  student_id: string;
  full_name: string | null;
  username: string;
  email: string;
  exam_id: string | null;
  exam_title: string | null;
  session_id: string | null;
  version_code: string | null;
  score: number | null;
  max_points: number | null;
  submitted_at: string | null;
  status: string | null;
  grading_status: string | null;
}

export interface GradeExamOption {
  id: string;
  title: string;
  submitted_count: number;
}

export interface GradeReport {
  class_name: string;
  exam_id: string | null;
  submitted_count: number;
  class_student_total: number;
  items: GradeRow[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;
}

export interface TranscriptCourse {
  subject_name: string;
  subject_code: string | null;
  credits: number;
  grade10: number;
  grade4: number;
  letter: string;
  exam_title: string;
  submitted_at: string | null;
}

export interface StudentTranscript {
  student: {
    id: string;
    student_code: string;
    full_name: string;
    email: string;
    class_name: string;
    program_code: string;
    intake_year: number;
    section: string;
    major: string;
    training_system: string;
  };
  courses: TranscriptCourse[];
  summary: {
    gpa10: number;
    gpa4: number;
    totalCredits: number;
    classification: string;
  };
  issued_at: string;
}

const teacherStudentsApi = {
  list: (params: ListQueryParams & { subject_id?: string } = {}): Promise<PaginatedList<StudentItem>> =>
    fetchPaginatedList<StudentItem>('/teacher-students', params),

  add: async (body: {
    full_name?: string;
    username: string;
    email: string;
    password: string;
  }): Promise<StudentItem> => {
    const res = await apiClient.post<{ success: boolean; data: StudentItem }>(
      '/teacher-students',
      body
    );
    return res.data.data;
  },

  update: async (
    id: string,
    fields: {
      full_name?: string;
      username?: string;
      email?: string;
      is_active?: boolean;
      password?: string;
    }
  ): Promise<StudentItem> => {
    const res = await apiClient.patch<{ success: boolean; data: StudentItem }>(
      `/teacher-students/${id}`,
      fields
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/teacher-students/${id}`);
  },

  getGradeExams: async (
    adminClassId?: string
  ): Promise<{ class_name: string; exams: GradeExamOption[] }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: { class_name: string; exams: GradeExamOption[] };
    }>('/teacher-students/grade-report/exams', {
      params: adminClassId ? { admin_class_id: adminClassId } : undefined,
    });
    return res.data.data;
  },

  getGradeReport: async (
    examId: string,
    params: ListQueryParams & { admin_class_id?: string } = {}
  ): Promise<GradeReport> => {
    const res = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>(
      '/teacher-students/grade-report',
      { params: { exam_id: examId, ...params } }
    );
    const body = res.data.data;
    const paginated = unwrapPaginatedData<GradeRow>(body);
    return {
      class_name: String(body.class_name ?? ''),
      exam_id: (body.exam_id as string | null) ?? null,
      submitted_count: Number(body.submitted_count ?? 0),
      class_student_total: Number(body.class_student_total ?? 0),
      ...paginated,
    };
  },

  downloadGradeExport: async (examId: string, adminClassId?: string): Promise<void> => {
    const res = await apiClient.get('/teacher-students/grade-report/export', {
      params: {
        exam_id: examId,
        ...(adminClassId ? { admin_class_id: adminClassId } : {}),
      },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cd = res.headers['content-disposition'] as string | undefined;
    const match = cd?.match(/filename="?([^"]+)"?/);
    a.download = match?.[1] ?? `bang_diem_chi_tiet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  sendGradeEmail: async (studentIds?: string[]): Promise<{ sent: number; total: number }> => {
    const res = await apiClient.post<{ success: boolean; data: { sent: number; total: number } }>(
      '/teacher-students/grade-report/email',
      { student_ids: studentIds }
    );
    return res.data.data;
  },

  getTranscript: async (studentId: string): Promise<StudentTranscript> => {
    const res = await apiClient.get<{ success: boolean; data: StudentTranscript }>(
      `/teacher-students/${studentId}/transcript`
    );
    return res.data.data;
  },

  downloadTranscriptExport: async (
    studentId: string,
    format: 'html' | 'csv',
    filename?: string
  ): Promise<void> => {
    const res = await apiClient.get(`/teacher-students/${studentId}/transcript/export`, {
      params: format === 'csv' ? { format: 'csv' } : {},
      responseType: 'blob',
    });
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/html;charset=utf-8';
    const blob = new Blob([res.data], { type: mime });
    const url = URL.createObjectURL(blob);
    if (format === 'html') {
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? 'bang_diem.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default teacherStudentsApi;
