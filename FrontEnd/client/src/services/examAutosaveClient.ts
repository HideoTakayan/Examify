import apiClient from './apiClient';

/** q1, q2, … — giá trị là display key (A–D) ô SV bấm trên màn hình, không unshuffle. */
export type DraftAnswers = Record<string, string>;

type DraftSnapshot = {
  examId: string;
  savedAt: string;
  answers: DraftAnswers;
};

type PendingAutosave = {
  examId: string;
  payload: DraftSnapshot;
};

const draftKey = (examId: string) => `exam_draft_answers_${examId}`;
const pendingKey = (examId: string) => `exam_pending_autosave_${examId}`;

export const readDraftAnswers = (examId: string): DraftAnswers => {
  try {
    const raw = localStorage.getItem(draftKey(examId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DraftAnswers;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveDraftAnswers = (examId: string, answers: DraftAnswers) => {
  localStorage.setItem(draftKey(examId), JSON.stringify(answers));
};

/** Gộp bản nháp server (khôi phục cross-device) với local (ưu tiên local cho key trùng). */
export const mergeDraftAnswers = (
  serverAnswers: DraftAnswers | null | undefined,
  localAnswers: DraftAnswers
): DraftAnswers => {
  if (!serverAnswers || !Object.keys(serverAnswers).length) return { ...localAnswers };
  return { ...serverAnswers, ...localAnswers };
};

const readPending = (examId: string): PendingAutosave[] => {
  try {
    const raw = localStorage.getItem(pendingKey(examId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingAutosave[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePending = (examId: string, queue: PendingAutosave[]) => {
  localStorage.setItem(pendingKey(examId), JSON.stringify(queue.slice(-30)));
};

export const queueAutosave = (examId: string, answers: DraftAnswers) => {
  const queue = readPending(examId);
  queue.push({
    examId,
    payload: {
      examId,
      savedAt: new Date().toISOString(),
      answers,
    },
  });
  writePending(examId, queue);
};

export async function flushAutosaveQueue(examId: string): Promise<void> {
  const queue = readPending(examId);
  if (!queue.length) return;

  // Chỉ gửi snapshot mới nhất để giảm traffic.
  const latest = queue[queue.length - 1];
  try {
    await apiClient.post('/exams/autosave', {
      exam_id: latest.payload.examId,
      saved_at: latest.payload.savedAt,
      answers: latest.payload.answers,
    });
    writePending(examId, []);
  } catch {
    // Giữ queue để retry khi offline.
  }
}

