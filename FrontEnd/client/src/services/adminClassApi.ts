import apiClient from './apiClient';
import { fetchPaginatedList, type ListQueryParams, type PaginatedList } from './listApi';

export interface AdminClassDto {
  id: string;
  program_id: string | null;
  program_code: string;
  program_name?: string | null;
  intake_year: number;
  section: string;
  display_name: string;
  manager_teacher_id: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  expected_size: number;
  student_count?: number;
  created_at: string;
}

export type ClassStudent = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
};

export type ImportPreviewRow = {
  row: number;
  username: string;
  email: string;
  full_name: string;
  status: 'ok' | 'warn_transfer' | 'will_create' | 'error';
  message: string;
  student_id?: string;
};

export type ImportConfirmCreateRow = {
  username: string;
  email: string;
  full_name?: string;
};

const adminClassApi = {
  getClasses: async (): Promise<AdminClassDto[]> => {
    const res = await apiClient.get<{ success: boolean; data: AdminClassDto[] }>('/admin-classes');
    return res.data.data;
  },

  getClass: async (id: string): Promise<AdminClassDto> => {
    const res = await apiClient.get<{ success: boolean; data: AdminClassDto }>(`/admin-classes/${id}`);
    return res.data.data;
  },

  createClass: async (payload: {
    program_id: string;
    intake_year: number;
    section: string;
    display_name: string;
    manager_teacher_id?: string | null;
    expected_size?: number;
  }): Promise<AdminClassDto> => {
    const res = await apiClient.post<{ success: boolean; data: AdminClassDto }>('/admin-classes', payload);
    return res.data.data;
  },

  updateClass: async (
    id: string,
    payload: Partial<{
      display_name: string;
      manager_teacher_id: string | null;
      expected_size: number;
      intake_year: number;
      section: string;
    }>
  ): Promise<AdminClassDto> => {
    const res = await apiClient.patch<{ success: boolean; data: AdminClassDto }>(
      `/admin-classes/${id}`,
      payload
    );
    return res.data.data;
  },

  deleteClass: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin-classes/${id}`);
  },

  listStudents: async (
    classId: string,
    params: ListQueryParams = {}
  ): Promise<PaginatedList<ClassStudent>> =>
    fetchPaginatedList<ClassStudent>(`/admin-classes/${classId}/students`, params),

  listUnassigned: async (params: ListQueryParams = {}): Promise<PaginatedList<ClassStudent>> =>
    fetchPaginatedList<ClassStudent>('/admin-classes/unassigned-students', params),

  assignStudents: async (
    classId: string,
    studentIds: string[],
    allowTransfer = false
  ): Promise<{ assigned: number; skipped: { id: string; reason: string }[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { assigned: number; skipped: { id: string; reason: string }[] };
    }>(`/admin-classes/${classId}/students/assign`, {
      student_ids: studentIds,
      allow_transfer: allowTransfer,
    });
    return res.data.data;
  },

  removeStudent: async (classId: string, studentId: string): Promise<void> => {
    await apiClient.delete(`/admin-classes/${classId}/students/${studentId}`);
  },

  bulkRemoveStudents: async (
    classId: string,
    studentIds: string[]
  ): Promise<{ removed: number; failed: { id: string; reason: string }[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { removed: number; failed: { id: string; reason: string }[] };
    }>(`/admin-classes/${classId}/students/bulk-remove`, { student_ids: studentIds });
    return res.data.data;
  },

  addManualStudent: async (
    classId: string,
    payload: {
      username: string;
      email: string;
      full_name?: string;
      password?: string;
      allow_transfer?: boolean;
    }
  ) => {
    const res = await apiClient.post<{ success: boolean; data: unknown }>(
      `/admin-classes/${classId}/students/manual`,
      payload
    );
    return res.data.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    const res = await apiClient.get('/admin-classes/import-template', {
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  importPreview: async (
    classId: string,
    file: File,
    allowTransfer: boolean
  ): Promise<ImportPreviewRow[]> => {
    const form = new FormData();
    form.append('file', file);
    form.append('allow_transfer', String(allowTransfer));
    const res = await apiClient.post<{ success: boolean; data: { rows: ImportPreviewRow[] } }>(
      `/admin-classes/${classId}/students/import/preview`,
      form,
    );
    return res.data.data.rows;
  },

  importConfirm: async (
    classId: string,
    payload: {
      studentIds: string[];
      creates: ImportConfirmCreateRow[];
      allowTransfer: boolean;
    }
  ): Promise<{
    assigned: number;
    created: number;
    skipped: { id: string; reason: string }[];
    create_errors: { username: string; reason: string }[];
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        assigned: number;
        created: number;
        skipped: { id: string; reason: string }[];
        create_errors: { username: string; reason: string }[];
      };
    }>(`/admin-classes/${classId}/students/import/confirm`, {
      student_ids: payload.studentIds,
      creates: payload.creates,
      allow_transfer: payload.allowTransfer,
    }, { timeout: 120000 });
    return res.data.data;
  },
};

export default adminClassApi;
