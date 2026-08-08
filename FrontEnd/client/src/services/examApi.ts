import apiClient from './apiClient';
import type { ForceSubmitSummary } from './examRealtimeSocket';
import {
  fetchPaginatedList,
  fetchAllListItems,
  type ListQueryParams,
  type PaginatedList,
} from './listApi';

export type { ForceSubmitSummary };

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  class_id?: string | null;
  admin_class_id?: string | null;
  num_versions?: number;
  subject_id?: string | null;
  created_by: string;
  duration_min: number;
  /** @deprecated dùng ends_at */
  closes_at?: string | null;
  /** Giờ mở thi (ISO) — hệ thống tự mở phiên */
  opens_at?: string | null;
  /** Giờ kết thúc / tự nộp (ISO) */
  ends_at?: string | null;
  created_at: string;
  subject_name?: string;
  subject_code?: string | null;
  admin_class_name?: string | null;
  class_semester?: string;
  class_year?: number;
  creator_name?: string | null;
  /** true khi GV đã bật thi (start-runtime) và chưa hết giờ */
  runtime_is_active?: boolean;
}

export type QuestionType = 'mcq' | 'essay';
export type QuestionDifficulty = 'DE' | 'TRUNGBINH' | 'KHO';

export interface Question {
  id: string;
  exam_id: string;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  points: number;
  display_order?: number;
  created_at: string;
  correct_answer?: string | string[];
  media_url?: string | null;
  difficulty?: QuestionDifficulty;
  chapter?: number | null;
  chapter_label?: string | null;
  answer_hint?: string | null;
  explanation?: string | null;
  version_index?: number;
  question_bank_id?: string | null;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  /** BE: cột submitted_at khi nộp bài */
  submitted_at?: string | null;
  finished_at?: string | null;
  status: 'active' | 'submitted' | 'expired';
  score?: number | null;
  max_points?: number | null;
  grading_status?: 'pending_manual' | 'complete' | null;
  /** Có khi GET /exams/:examId/sessions (JOIN accounts) */
  full_name?: string | null;
  email?: string | null;
  /** Từ getSessionsByExamWithStudent — tên sinh viên */
  student_name?: string | null;
  student_email?: string | null;
  version_code?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  submit_source?: 'student' | 'force_submit' | 'violation_auto' | 'timer' | null;
  disconnect_flag?: boolean;
  strike_count?: number;
  session_tags?: Array<
    | 'submitted'
    | 'disconnected'
    | 'violations_exceeded'
    | 'retake_pending'
    | 'retake_session'
    | 'voided'
  >;
  previous_score?: number | null;
  previous_max_points?: number | null;
}

export interface ExamRetakeGrant {
  id: string;
  exam_id: string;
  student_id: string;
  granted_by: string;
  reason: string;
  status: 'approved' | 'consumed' | 'revoked';
  superseded_session_id: string | null;
  consumed_session_id: string | null;
  granted_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
}

export interface StartSessionData {
  session: ExamSession;
  deadline_at: string;
  duration_min: number;
  version_code: string;
  version_id: string;
  questions: Array<{
    id: string;
    display_order: number;
    content: string;
    question_type: QuestionType;
    options: Record<string, string> | null;
    points: number;
    media_url?: string | null;
  }>;
  /** Đồng hồ lớp khi GV đã bật thi — ưu tiên hơn deadline cá nhân */
  runtime_state?: {
    started_at: string;
    ends_at: string;
    is_active: boolean;
  } | null;
  /** Bản nháp mới nhất trên server */
  autosave?: {
    saved_at: string;
    answers: Record<string, string>;
  } | null;
}

export interface SubmitResult {
  session: ExamSession;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  grading_status: 'pending_manual' | 'complete';
  learning_assessment_summary?: {
    total_questions: number;
    wrong_count: number;
    wrong_rate: number;
    mode: 'full_wrong_details' | 'chapter_samples' | 'summary_only' | 'all_wrong_summary';
    chapter_summary: Array<{
      chapter: number | null;
      chapter_label: string | null;
      total: number;
      wrong: number;
      wrong_rate: number;
      easy_wrong: number;
      medium_wrong: number;
      hard_wrong: number;
    }>;
    representative_wrong_items: Array<{
      q: number;
      stem: string;
      chapter: number | null;
      chapter_label: string | null;
      difficulty: QuestionDifficulty;
      explanation_short?: string;
    }>;
  };
  details: Array<{
    question_id: string;
    question_type: QuestionType;
    submitted: string | string[] | null;
    correct?: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
  }>;
}

export interface MySubmission {
  session: ExamSession;
  score: number | null;
  max_points: number | null;
  grading_status: 'pending_manual' | 'complete' | null;
  details: SubmitResult['details'];
}

export interface ExamProctoringData {
  exam_id: string;
  total_sessions: number;
  active_sessions: number;
  submitted_sessions: number;
  expired_sessions: number;
  sessions: Array<{
    session_id: string;
    student_id: string;
    student_name: string | null;
    student_email: string | null;
    status: 'active' | 'submitted' | 'expired';
    started_at: string;
    finished_at: string | null;
    score: number | null;
    max_points: number | null;
    violation_count: number;
    violations: Array<{
      event_type: string;
      client_at: string;
      details: Record<string, unknown> | null;
    }>;
  }>;
}

export interface GradingPayload {
  session: ExamSession;
  exam: Exam;
  student: { full_name: string | null; email: string | null };
  questions: Question[];
  graded_details: Array<{
    question_id: string;
    question_type: QuestionType;
    submitted: string | string[] | null;
    correct?: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
    teacher_comment?: string | null;
  }>;
}

export interface SessionReview {
  session: ExamSession;
  exam: Exam;
  score: number | null;
  max_points: number | null;
  grading_status: 'pending_manual' | 'complete' | null;
  learning_assessment_summary?: SubmitResult['learning_assessment_summary'];
  questions: Array<{
    question_id: string;
    question_type: QuestionType;
    content: string;
    options: Record<string, string> | null;
    explanation: string | null;
    difficulty?: QuestionDifficulty;
    chapter?: number | null;
    chapter_label?: string | null;
    submitted: string | string[] | null;
    correct: string | string[] | null;
    is_correct: boolean;
    points_earned: number | null;
    max_points: number;
    pending_grading?: boolean;
    teacher_comment?: string | null;
  }>;
}

export interface StartRuntimeResult {
  examId: string;
  startedAt: string;
  endsAt: string;
  durationMin: number;
}

export interface ImportedQuestionDraft {
  content: string;
  question_type: QuestionType;
  points: number;
  options?: Record<string, string> | null;
  correct_answer?: string | string[] | null;
  display_order: number;
  difficulty?: QuestionDifficulty;
  chapter?: number | null;
  chapter_label?: string | null;
  media?: {
    type: "image" | "audio" | "video";
    filename: string;
    status: "found" | "missing" | "embedded";
    url?: string;
    source?: "archive" | "manual";
  } | null;
  /** URL sau upload (Cloudinary); BE commit/import đọc kèm media.url */
  media_url?: string | null;
  answer_hint?: string | null;
  ai_confidence?: number;
  needs_review?: boolean;
  review_reason?: string | null;
  version_index?: number;
  question_bank_id?: string;
}

export interface ExamImportPreview {
  exam: {
    title?: string;
    duration_min?: number;
    description?: string;
  };
  questions: ImportedQuestionDraft[];
  chapter_definitions: Array<{
    chapter: number;
    label: string;
  }>;
  errors: string[];
  warnings: string[];
  parse_summary?: {
    total_parsed: number;
    auto_ok: number;
    needs_review: number;
    missing_media: number;
    parse_time_ms: number;
  };
}

export interface MediaUploadResult {
  url: string;
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  bytes: number;
  format?: string | null;
}

export interface PredictionSubject {
  subject: string;
  semester: number;
  credits: number;
  predicted_score: number;
  grade: string;
  confidence: number;
  trend: 'up' | 'stable' | 'down';
  correlation_r: number;
  reasoning: string;
}

export interface JustCompleted {
  subject: string;
  score: number;
  grade: string;
  vs_class_avg?: string;
  analysis?: string;
}

export interface WrongItemSummary {
  q: number;
  stem: string;
  chapter?: number | null;
  chapter_label?: string | null;
  explanation_short?: string;
}

export interface ChapterInsightSummary {
  chapter: number | null;
  label: string;
  wrong_count: number;
  question_numbers: number[];
}

export interface PredictionEligibility {
  eligible: boolean;
  target_subject: string;
  target_id: string | null;
  group_labels: string[];
  missing_prerequisites: string[];
  scored_in_group: string[];
  message: string;
}

export interface PredictionHistoryRow {
  subject_id: string | null;
  subject: string;
  semester: number | null;
  score: number;
  grade: string;
  submitted_at: string | null;
}

export interface LearningAssessment {
  remark: string;
  weaknesses: string[];
  advice: string[];
  comparison: string;
  quantitative?: {
    predicted_score: number;
    class_avg: number;
    percentile: number;
    predicted_grade: string;
  };
}

export interface PredictionResult {
  target_subject?: string;
  target_subject_id?: string;
  just_completed: JustCompleted;
  predictions: PredictionSubject[];
  learning_assessment?: LearningAssessment;
  overall_advice: string;
  weak_chapters?: ChapterInsightSummary[];
  wrong_summary?: WrongItemSummary[];
  improvement?: string[];
}

export interface PredictionRecomputeSummary {
  total_students: number;
  computed: number;
  skipped_no_data: number;
  failed: number;
  errors: string[];
}

const examApi = {
  listExams: async (params: ListQueryParams & { class_id?: string; admin_class_id?: string } = {}): Promise<PaginatedList<Exam>> => {
    const query: ListQueryParams = { ...params };
    return fetchPaginatedList<Exam>('/exams', query);
  },

  /** Lấy tối đa 500 đề — dùng cho dashboard/filter client-side */
  getExams: async (
    classId?: string,
    extraParams?: Record<string, string>,
    options?: { cnttProgramOnly?: boolean }
  ): Promise<Exam[]> => {
    const params: Record<string, string> = {};
    if (classId) params.class_id = classId;
    if (extraParams) Object.assign(params, extraParams);
    if (options?.cnttProgramOnly !== false) {
      params.program_scope = 'cntt';
    }
    return fetchAllListItems<Exam>('/exams', params);
  },

  getExam: async (id: string): Promise<Exam> => {
    const res = await apiClient.get<{ success: boolean; data: Exam }>(`/exams/${id}`);
    return res.data.data;
  },

  createExam: async (payload: {
    title: string;
    class_id: string;
    duration_min: number;
    description?: string;
    closes_at?: string | null;
    opens_at?: string | null;
    ends_at?: string | null;
  }): Promise<Exam> => {
    const res = await apiClient.post<{ success: boolean; data: Exam }>('/exams', payload);
    return res.data.data;
  },

  updateExam: async (
    id: string,
    payload: Partial<Pick<Exam, 'title' | 'description' | 'duration_min' | 'closes_at' | 'opens_at' | 'ends_at' | 'num_versions'>>
  ): Promise<Exam> => {
    const res = await apiClient.patch<{ success: boolean; data: Exam }>(`/exams/${id}`, payload);
    return res.data.data;
  },

  deleteExam: async (id: string): Promise<void> => {
    await apiClient.delete(`/exams/${id}`);
  },

  getQuestions: async (examId: string): Promise<Question[]> => {
    const res = await apiClient.get<{ success: boolean; data: Question[] }>(
      `/exams/${examId}/questions`
    );
    return res.data.data;
  },

  addQuestion: async (
    examId: string,
    payload: {
      content: string;
      points: number;
      question_type?: QuestionType;
      options?: Record<string, string>;
      correct_answer?: string | string[];
      media_url?: string | null;
      difficulty?: QuestionDifficulty;
      chapter?: number | null;
      chapter_label?: string | null;
      answer_hint?: string | null;
      version_index?: number;
      question_bank_id?: string;
    }
  ): Promise<Question> => {
    const res = await apiClient.post<{ success: boolean; data: Question }>(
      `/exams/${examId}/questions`,
      payload
    );
    return res.data.data;
  },

  updateQuestion: async (
    examId: string,
    questionId: string,
    payload: {
      content: string;
      points: number;
      question_type: QuestionType;
      options?: Record<string, string> | null;
      correct_answer?: string | string[] | null;
      media_url?: string | null;
      difficulty?: QuestionDifficulty;
      chapter?: number | null;
      chapter_label?: string | null;
      answer_hint?: string | null;
      display_order: number;
    }
  ): Promise<Question> => {
    const res = await apiClient.patch<{ success: boolean; data: Question }>(
      `/exams/${examId}/questions/${questionId}`,
      payload
    );
    return res.data.data;
  },

  downloadWordImportTemplate: async (): Promise<void> => {
    const res = await apiClient.get<Blob>('/exams/import-word/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exam_import_sample_pack.zip';
    link.click();
    URL.revokeObjectURL(url);
  },

  previewWordImport: async (file: File, mediaArchive?: File | null): Promise<ExamImportPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    if (mediaArchive) formData.append('mediaArchive', mediaArchive);
    const res = await apiClient.post<{ success: boolean; data: ExamImportPreview }>(
      '/exams/import-word/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  commitWordImport: async (payload: {
    title: string;
    admin_class_id: string;
    subject_id: string;
    class_id?: string | null;
    duration_min: number;
    description?: string | null;
    closes_at?: string | null;
    opens_at?: string | null;
    ends_at?: string | null;
    num_versions?: number;
    questions: ImportedQuestionDraft[];
  }): Promise<{ exam: Exam; questions: Question[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { exam: Exam; questions: Question[] };
    }>('/exams/import-word/commit', payload);
    return res.data.data;
  },

  aiRecomposeExam: async (payload:
    | {
        file: File;
        mediaArchive?: File | null;
        examInfo: { title?: string; duration_min?: number; description?: string };
      }
    | {
        questions: ImportedQuestionDraft[];
        examInfo: { title?: string; duration_min?: number; description?: string };
      }
  ): Promise<ExamImportPreview> => {
    if (!('file' in payload)) {
      throw new Error('AI recompose trong luồng này yêu cầu file .docx để phân tích lại.');
    }
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.mediaArchive) formData.append('mediaArchive', payload.mediaArchive);
    formData.append('examInfo', JSON.stringify(payload.examInfo));
    const res = await apiClient.post<{ success: boolean; data: ExamImportPreview }>(
      '/exams/import-word/ai-recompose',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }
    );
    return res.data.data;
  },

  uploadExamMedia: async (
    file: File,
    options?: { scope?: 'preview-temp' | 'permanent' }
  ): Promise<MediaUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.scope) formData.append('scope', options.scope);
    const res = await apiClient.post<{ success: boolean; data: MediaUploadResult }>(
      '/exams/upload-media',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },

  deleteQuestion: async (examId: string, questionId: string): Promise<void> => {
    await apiClient.delete(`/exams/${examId}/questions/${questionId}`);
  },

  startSession: async (examId: string): Promise<StartSessionData> => {
    const res = await apiClient.post<{ success: boolean; data: StartSessionData }>(
      `/exams/${examId}/sessions`
    );
    return res.data.data;
  },

  submitSession: async (
    sessionId: string,
    answers: Record<string, string | string[]>
  ): Promise<SubmitResult> => {
    const res = await apiClient.post<{ success: boolean; data: SubmitResult }>(
      `/exams/sessions/${sessionId}/submit`,
      { answers }
    );
    return res.data.data;
  },

  getMySessions: async (): Promise<ExamSession[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamSession[] }>(
      '/exams/sessions/me'
    );
    return res.data.data;
  },

  getMyRetakeGrants: async (): Promise<ExamRetakeGrant[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamRetakeGrant[] }>(
      '/exams/retake-grants/me'
    );
    return res.data.data ?? [];
  },

  listRetakeGrants: async (examId: string): Promise<ExamRetakeGrant[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamRetakeGrant[] }>(
      `/exams/${examId}/retake-grants`
    );
    return res.data.data ?? [];
  },

  grantRetake: async (
    examId: string,
    payload: { student_id: string; reason: string }
  ): Promise<ExamRetakeGrant> => {
    const res = await apiClient.post<{ success: boolean; data: ExamRetakeGrant }>(
      `/exams/${examId}/retake-grants`,
      payload
    );
    return res.data.data;
  },

  revokeRetake: async (examId: string, grantId: string): Promise<ExamRetakeGrant> => {
    const res = await apiClient.delete<{ success: boolean; data: ExamRetakeGrant }>(
      `/exams/${examId}/retake-grants/${grantId}`
    );
    return res.data.data;
  },

  listExamSessions: async (
    examId: string,
    params: ListQueryParams = {}
  ): Promise<PaginatedList<ExamSession>> =>
    fetchPaginatedList<ExamSession>(`/exams/${examId}/sessions`, params),

  getExamSessions: async (
    examId: string,
    params?: { page?: number; limit?: number; offset?: number }
  ): Promise<ExamSession[]> => {
    const limit = params?.limit ?? 500;
    const offset =
      params?.offset ?? (params?.page != null ? (params.page - 1) * limit : 0);
    const result = await fetchPaginatedList<ExamSession>(`/exams/${examId}/sessions`, {
      limit,
      offset,
    });
    return result.items;
  },

  forceSubmitExam: async (examId: string): Promise<ForceSubmitSummary> => {
    const res = await apiClient.post<{ success: boolean; data: ForceSubmitSummary }>(
      `/exams/${examId}/force-submit`
    );
    return res.data.data;
  },

  forceSubmitSession: async (
    sessionId: string
  ): Promise<{ session_id: string; exam_id: string; student_id: string; submitted: boolean }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { session_id: string; exam_id: string; student_id: string; submitted: boolean };
    }>(`/exams/sessions/${sessionId}/force-submit`);
    return res.data.data;
  },

  startExamRuntime: async (examId: string): Promise<StartRuntimeResult> => {
    const res = await apiClient.post<{ success: boolean; data: StartRuntimeResult }>(
      `/exams/${examId}/start-runtime`
    );
    return res.data.data;
  },

  getMySubmission: async (examId: string): Promise<MySubmission> => {
    const res = await apiClient.get<{ success: boolean; data: MySubmission }>(
      `/exams/${examId}/my-submission`
    );
    return res.data.data;
  },

  getSessionGrading: async (sessionId: string): Promise<GradingPayload> => {
    const res = await apiClient.get<{ success: boolean; data: GradingPayload }>(
      `/exams/sessions/${sessionId}/grading`
    );
    return res.data.data;
  },

  gradeSession: async (
    sessionId: string,
    grades: Record<string, { points_awarded: number; comment?: string }>
  ): Promise<ExamSession> => {
    const res = await apiClient.patch<{ success: boolean; data: ExamSession }>(
      `/exams/sessions/${sessionId}/grade`,
      { grades }
    );
    return res.data.data;
  },

  getSessionReview: async (sessionId: string): Promise<SessionReview> => {
    const res = await apiClient.get<{ success: boolean; data: SessionReview }>(
      `/exams/sessions/${sessionId}/review`
    );
    return res.data.data;
  },

  getExamProctoring: async (examId: string): Promise<ExamProctoringData> => {
    const res = await apiClient.get<{ success: boolean; data: ExamProctoringData }>(
      `/exams/${examId}/proctoring`
    );
    return res.data.data;
  },

  // P0 Fix: Report violation immediately to server
  reportViolation: async (
    sessionId: string,
    payload: {
      violation_type: 'fullscreen_exit' | 'visibility_hidden' | 'window_blur' | 'tab_switch' | 'devtools_open' | 'copy_attempt' | 'paste_attempt' | 'context_menu' | 'other';
      reason: string;
      client_at?: string;
      auto_submit?: boolean;
    }
  ): Promise<{
    acknowledged: boolean;
    violation_id: string;
    session_status: 'active' | 'submitted' | 'expired' | 'violation_locked';
    auto_submit_triggered: boolean;
    message: string;
  }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        acknowledged: boolean;
        violation_id: string;
        session_status: 'active' | 'submitted' | 'expired' | 'violation_locked';
        auto_submit_triggered: boolean;
        message: string;
      };
    }>(`/exams/sessions/${sessionId}/report-violation`, {
      ...payload,
      client_at: payload.client_at || new Date().toISOString(),
    });
    return res.data.data;
  },

  /** Sinh viên / admin: đọc cache dự đoán đã lưu. */
  getMyPredictionCache: async (): Promise<PredictionResult | null> => {
    const res = await apiClient.get<{ success: boolean; data: PredictionResult | null }>(
      '/prediction/me'
    );
    return res.data.data;
  },

  /** Rời trang prediction — xóa cache server (phiên đánh giá mới mỗi lần vào). */
  clearMyPredictionCache: async (): Promise<void> => {
    await apiClient.delete('/prediction/me');
  },

  getMyPredictionHistory: async (): Promise<PredictionHistoryRow[]> => {
    const res = await apiClient.get<{ success: boolean; data: PredictionHistoryRow[] }>(
      '/prediction/me/history'
    );
    return res.data.data ?? [];
  },

  getPredictionEligibility: async (targetSubjectId: string): Promise<PredictionEligibility> => {
    const res = await apiClient.get<{ success: boolean; data: PredictionEligibility }>(
      '/prediction/me/eligibility',
      { params: { target_subject_id: targetSubjectId } }
    );
    return res.data.data;
  },

  /** Sinh viên: dự đoán một môn đã chọn (5 song song, timeout 120s). */
  generateMyPrediction: async (targetSubjectId: string): Promise<PredictionResult> => {
    const res = await apiClient.post<{ success: boolean; data: PredictionResult }>(
      '/prediction/me/generate',
      { target_subject_id: targetSubjectId },
      { timeout: 125_000 }
    );
    return res.data.data;
  },

  /** Admin: tính lại dự đoán cho mọi sinh viên có dữ liệu, ghi cache. */
  adminRecomputeAllPredictions: async (): Promise<PredictionRecomputeSummary> => {
    const res = await apiClient.post<{ success: boolean; data: PredictionRecomputeSummary }>(
      '/prediction/admin/recompute-all',
      {},
      { timeout: 300_000 }
    );
    return res.data.data;
  },
};

export default examApi;
