import apiClient from './apiClient';
import type { SubjectCatalogResponse } from './subjectApi';

export interface ProgramDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  subject_count?: number;
  teacher_count?: number;
}

export interface ProgramTeacherDto {
  id: string;
  full_name: string | null;
  email: string;
  username: string;
}

export type CreateProgramPayload = {
  code: string;
  name: string;
  description?: string | null;
};

const programApi = {
  getPrograms: async (): Promise<ProgramDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: ProgramDto[] }>('/programs');
    return res.data.data;
  },

  createProgram: async (payload: CreateProgramPayload): Promise<ProgramDto> => {
    const res = await apiClient.post<{ success: boolean; data: ProgramDto }>('/programs', payload);
    return res.data.data;
  },

  updateProgram: async (
    id: string,
    payload: Partial<CreateProgramPayload> & { is_active?: boolean }
  ): Promise<ProgramDto> => {
    const res = await apiClient.patch<{ success: boolean; data: ProgramDto }>(
      `/programs/${id}`,
      payload
    );
    return res.data.data;
  },

  deleteProgram: async (id: string): Promise<void> => {
    await apiClient.delete(`/programs/${id}`);
  },

  getTeachers: async (programId: string): Promise<ProgramTeacherDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: ProgramTeacherDto[] }>(
      `/programs/${programId}/teachers`
    );
    return res.data.data;
  },

  setTeachers: async (programId: string, teacherIds: string[]): Promise<ProgramTeacherDto[]> => {
    const res = await apiClient.put<{ success: boolean; data: ProgramTeacherDto[] }>(
      `/programs/${programId}/teachers`,
      { teacher_ids: teacherIds }
    );
    return res.data.data;
  },

  applyBaseGroups: async (programId: string): Promise<SubjectCatalogResponse> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { catalog: SubjectCatalogResponse };
    }>(`/programs/${programId}/catalog/apply-base`);
    return res.data.data.catalog;
  },

  assignGroups: async (
    programId: string,
    groupIds: string[]
  ): Promise<SubjectCatalogResponse> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { catalog: SubjectCatalogResponse };
    }>(`/programs/${programId}/catalog/assign-groups`, { group_ids: groupIds });
    return res.data.data.catalog;
  },

  assignSubjects: async (
    programId: string,
    subjectIds: string[]
  ): Promise<SubjectCatalogResponse> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { catalog: SubjectCatalogResponse };
    }>(`/programs/${programId}/catalog/assign-subjects`, { subject_ids: subjectIds });
    return res.data.data.catalog;
  },

  unassignGroup: async (programId: string, groupId: string): Promise<void> => {
    await apiClient.delete(`/programs/${programId}/catalog/groups/${groupId}`);
  },
};

export default programApi;
