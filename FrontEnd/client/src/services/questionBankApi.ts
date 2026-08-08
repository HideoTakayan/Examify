import apiClient from './apiClient';
import type { QuestionType } from './examApi';
import type { PaginationMeta } from '@/utils/pagination';
import { unwrapPaginatedData } from '@/utils/pagination';

export type QBDifficulty = 'DE' | 'TRUNGBINH' | 'KHO';

export interface QuestionBankItem {
  id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  points: number;
  difficulty: QBDifficulty;
  chapter: number | null;
  answer_hint?: string | null;
  subject_id: string | null;
  tags: string[];
  usage_count: number;
}

export interface QuestionBankListParams {
  subject_id?: string;
  search?: string;
  question_type?: QuestionType;
  difficulty?: QBDifficulty;
  chapter?: number;
  limit?: number;
  offset?: number;
}

export type QuestionBankListResult = {
  items: QuestionBankItem[];
} & PaginationMeta;

type ListResponseBody = {
  success: boolean;
  data: {
    items: QuestionBankItem[];
    total: number;
    limit?: number;
    offset?: number;
    page?: number;
    total_pages?: number;
  };
};

const questionBankApi = {
  list: async (params: QuestionBankListParams = {}): Promise<QuestionBankListResult> => {
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = params.offset ?? 0;
    const query: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
    };
    if (params.subject_id) query.subject_id = params.subject_id;
    if (params.search) query.search = params.search;
    if (params.question_type) query.question_type = params.question_type;
    if (params.difficulty) query.difficulty = params.difficulty;
    if (params.chapter != null) query.chapter = String(params.chapter);

    const res = await apiClient.get<ListResponseBody>('/question-bank', { params: query });
    return unwrapPaginatedData<QuestionBankItem>(res.data.data);
  },

  importToExam: async (
    questionBankId: string,
    examId: string,
    opts?: { version_index?: number }
  ): Promise<{ question_id: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { question_id: string };
    }>(`/question-bank/${questionBankId}/import/${examId}`, opts ?? {});
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/question-bank/${id}`);
  },

  bulkRemove: async (ids: string[]): Promise<{ deleted: number; failed: number }> => {
    if (ids.length === 0) return { deleted: 0, failed: 0 };
    const results = await Promise.allSettled(ids.map((id) => questionBankApi.remove(id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { deleted: ids.length - failed, failed };
  },

};

export default questionBankApi;
