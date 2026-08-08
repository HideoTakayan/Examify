import apiClient from './apiClient';

export interface ClassDto {
  id: string;
  subject_id: string;
  teacher_id: string;
  semester: string;
  year: number;
  created_at: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string | null;
  teacher_email: string;
}

const classApi = {
  getClasses: async (): Promise<ClassDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: ClassDto[] }>('/classes');
    return res.data.data;
  },
};

export default classApi;
