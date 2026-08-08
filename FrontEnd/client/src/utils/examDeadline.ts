import type { Exam, ExamSession } from '@/services/examApi';

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Giờ kết thúc / hạn nộp (ends_at ưu tiên, closes_at legacy). */
export function effectiveExamEndsAt(exam: Pick<Exam, 'ends_at' | 'closes_at'>): string | null {
  return exam.ends_at ?? exam.closes_at ?? null;
}

export function isBeforeExamOpens(
  exam: Pick<Exam, 'opens_at'>,
  nowMs: number = Date.now()
): boolean {
  const t = toMs(exam.opens_at);
  if (t === null) return false;
  return nowMs < t;
}

export function isPastExamEnd(
  exam: Pick<Exam, 'ends_at' | 'closes_at'>,
  latest: Pick<ExamSession, 'status'> | undefined,
  nowMs: number = Date.now()
): boolean {
  if (latest?.status === 'active') return false;
  const end = effectiveExamEndsAt(exam);
  const t = toMs(end);
  if (t === null) return false;
  return nowMs > t;
}

/** @deprecated use isPastExamEnd */
export function isPastExamStartDeadline(
  exam: Pick<Exam, 'closes_at' | 'ends_at'>,
  latest: Pick<ExamSession, 'status'> | undefined,
  nowMs: number = Date.now()
): boolean {
  return isPastExamEnd(exam, latest, nowMs);
}

export function canStudentEnterExam(
  exam: Pick<Exam, 'opens_at' | 'ends_at' | 'closes_at' | 'runtime_is_active'>,
  latest: Pick<ExamSession, 'status'> | undefined,
  nowMs: number = Date.now()
): boolean {
  if (isPastExamEnd(exam, latest, nowMs)) return false;
  if (isBeforeExamOpens(exam, nowMs)) {
    return Boolean(exam.runtime_is_active);
  }
  return true;
}

export function formatExamScheduleRange(exam: Pick<Exam, 'opens_at' | 'ends_at' | 'closes_at'>): string {
  const parts = getExamScheduleParts(exam);
  if (parts.start && parts.end) return `${parts.start} → ${parts.end}`;
  if (parts.start) return parts.start;
  if (parts.end) return parts.end;
  return '—';
}

export function formatScheduleDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getExamScheduleParts(exam: Pick<Exam, 'opens_at' | 'ends_at' | 'closes_at'>): {
  start: string | null;
  end: string | null;
} {
  const endIso = effectiveExamEndsAt(exam);
  return {
    start: exam.opens_at ? formatScheduleDateTime(exam.opens_at) : null,
    end: endIso ? formatScheduleDateTime(endIso) : null,
  };
}

/** Thời lượng (phút) từ giờ bắt đầu → kết thúc. */
export function scheduleDurationMin(opensAt: string, endsAt: string): number | null {
  const o = toMs(opensAt);
  const e = toMs(endsAt);
  if (o == null || e == null || e <= o) return null;
  return Math.max(1, Math.min(300, Math.ceil((e - o) / 60_000)));
}

/** GV chỉ mở sớm thủ công trước opens_at; từ opens_at trở đi hệ thống tự mở. */
export function canTeacherManualOpenExam(
  exam: Pick<Exam, 'opens_at' | 'ends_at' | 'closes_at' | 'runtime_is_active'>,
  nowMs: number = Date.now()
): boolean {
  if (exam.runtime_is_active) return false;
  const end = effectiveExamEndsAt(exam);
  if (end && toMs(end) != null && nowMs > toMs(end)!) return false;
  if (!exam.opens_at) return true;
  return isBeforeExamOpens(exam, nowMs);
}

export function msUntilOpensAt(
  exam: Pick<Exam, 'opens_at'>,
  nowMs: number = Date.now()
): number | null {
  const t = toMs(exam.opens_at);
  if (t == null) return null;
  return Math.max(0, t - nowMs);
}

export function formatCountdownHms(totalMs: number): string {
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Giá trị cho input datetime-local từ ISO (giờ máy người dùng). */
export function isoToDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
