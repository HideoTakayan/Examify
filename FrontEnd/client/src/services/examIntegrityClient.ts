import apiClient from './apiClient';

export type IntegrityEventType =
  | 'exam_opened'
  | 'fullscreen_enter'
  | 'fullscreen_exit'
  | 'fullscreen_error'
  | 'visibility_hidden'
  | 'window_blur'
  | 'window_focus'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'context_menu'
  | 'before_unload';

export type IntegrityEvent = {
  examId: string;
  type: IntegrityEventType;
  at: string;
  details?: Record<string, unknown>;
};

const queueKey = (examId: string) => `exam_integrity_queue_${examId}`;

const readQueue = (examId: string): IntegrityEvent[] => {
  try {
    const raw = localStorage.getItem(queueKey(examId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntegrityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (examId: string, queue: IntegrityEvent[]) => {
  localStorage.setItem(queueKey(examId), JSON.stringify(queue.slice(-300)));
};

const pushQueue = (event: IntegrityEvent) => {
  const queue = readQueue(event.examId);
  queue.push(event);
  writeQueue(event.examId, queue);
};

async function sendBatch(examId: string, events: IntegrityEvent[]) {
  await apiClient.post('/exams/integrity-events', { exam_id: examId, events });
}

export async function flushIntegrityQueue(examId: string): Promise<void> {
  const queue = readQueue(examId);
  if (!queue.length) return;

  try {
    await sendBatch(examId, queue);
    writeQueue(examId, []);
  } catch {
    // Giữ queue để retry về sau.
  }
}

export async function trackIntegrityEvent(
  examId: string,
  type: IntegrityEventType,
  details?: Record<string, unknown>,
): Promise<void> {
  const event: IntegrityEvent = {
    examId,
    type,
    at: new Date().toISOString(),
    details,
  };

  pushQueue(event);
  await flushIntegrityQueue(examId);
}

