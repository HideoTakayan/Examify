import apiClient from './apiClient';

export interface GradingOffering {
  id: string;
  section_name: string;
  subject_name: string;
  subject_code: string;
  semester_name: string;
  year: number;
  student_count: string;
}

export interface GradingStudent {
  student_id: string;
  student_code: string;
  full_name: string;
  email: string;
  final_score: number | null;
  online_max_score: number | null;
}

export interface SaveGradesPayload {
  grades: {
    student_id: string;
    final_score: number | null;
  }[];
}

const gradingApi = {
  getOfferings: async (): Promise<GradingOffering[]> => {
    const res = await apiClient.get('/grading/offerings');
    return res.data;
  },

  getOfferingStudents: async (offeringId: string): Promise<GradingStudent[]> => {
    const res = await apiClient.get(`/grading/offerings/${offeringId}/students`);
    return res.data;
  },

  saveGrades: async (offeringId: string, payload: SaveGradesPayload): Promise<void> => {
    await apiClient.post(`/grading/offerings/${offeringId}/grades`, payload);
  },

  syncExamGrades: async (offeringId: string): Promise<{ syncedCount: number }> => {
    const res = await apiClient.post(`/grading/offerings/${offeringId}/sync`);
    return res.data;
  },
};

export default gradingApi;
