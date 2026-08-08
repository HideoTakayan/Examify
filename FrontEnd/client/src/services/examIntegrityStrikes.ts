/** Số lần cảnh cáo trước khi khóa + tự động nộp bài. */
export const MAX_INTEGRITY_STRIKES = 3;

/** Gộp blur + visibility (cùng một lần chuyển tab) thành 1 cảnh cáo. */
export const STRIKE_DEDUPE_MS = 2500;

export type StrikeRecord = {
  count: number;
  sessionId: string | null;
  lastAt: number;
};

const strikeKey = (examId: string) => `exam_integrity_strikes_${examId}`;

export function loadStrikes(examId: string): StrikeRecord {
  try {
    const raw = sessionStorage.getItem(strikeKey(examId));
    if (!raw) return { count: 0, sessionId: null, lastAt: 0 };
    const parsed = JSON.parse(raw) as StrikeRecord;
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      sessionId: parsed.sessionId ?? null,
      lastAt: typeof parsed.lastAt === 'number' ? parsed.lastAt : 0,
    };
  } catch {
    return { count: 0, sessionId: null, lastAt: 0 };
  }
}

export function saveStrikes(examId: string, record: StrikeRecord) {
  sessionStorage.setItem(strikeKey(examId), JSON.stringify(record));
}

export function clearStrikes(examId: string) {
  sessionStorage.removeItem(strikeKey(examId));
}

export function registerStrike(
  examId: string,
  sessionId: string | null,
  dedupeMs: number = STRIKE_DEDUPE_MS
): { record: StrikeRecord; incremented: boolean } {
  const now = Date.now();
  let record = loadStrikes(examId);

  if (sessionId && record.sessionId !== sessionId) {
    record = { count: 0, sessionId, lastAt: 0 };
  }

  if (now - record.lastAt < dedupeMs) {
    return { record, incremented: false };
  }

  record = {
    count: record.count + 1,
    sessionId: sessionId ?? record.sessionId,
    lastAt: now,
  };
  saveStrikes(examId, record);
  return { record, incremented: true };
}
