import { clearStrikes } from '@/services/examIntegrityStrikes';

export const VIOLATION_STORAGE_KEY = (examId: string) => `exam_violation_${examId}`;

export type ViolationStorageData = {
  reason: string;
  sessionId: string;
  at: number;
  violationType: string;
  serverConfirmed: boolean;
};

export function saveViolationToStorage(examId: string, data: ViolationStorageData): void {
  try {
    sessionStorage.setItem(VIOLATION_STORAGE_KEY(examId), JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function loadViolationFromStorage(examId: string): ViolationStorageData | null {
  try {
    const raw = sessionStorage.getItem(VIOLATION_STORAGE_KEY(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ViolationStorageData;
    // Only restore if violation was recent (within 30 seconds)
    if (Date.now() - parsed.at > 30000) {
      sessionStorage.removeItem(VIOLATION_STORAGE_KEY(examId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearViolationStorage(examId: string): void {
  try {
    sessionStorage.removeItem(VIOLATION_STORAGE_KEY(examId));
    clearStrikes(examId);
  } catch {
    // Ignore
  }
}
