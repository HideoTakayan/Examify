/** Helpers for exam schedule fields (opens_at, ends_at). */

export function scheduleToTimestampMs(value: string): number | null {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export function isMalformedScheduleAt(value: string | null | undefined): boolean {
  if (value === undefined || value === null || value === "") return false;
  return scheduleToTimestampMs(value) === null;
}

export function normalizeScheduleAtInput(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function isBeforeOpensAt(opensAt: string, nowMs: number): boolean {
  const t = scheduleToTimestampMs(opensAt);
  if (t === null) return false;
  return nowMs < t;
}

export function isPastEndsAt(endsAt: string, nowMs: number): boolean {
  const t = scheduleToTimestampMs(endsAt);
  if (t === null) return false;
  return nowMs > t;
}

export function assertValidExamSchedule(
  opensAt: string | null | undefined,
  endsAt: string | null | undefined
): void {
  if (isMalformedScheduleAt(opensAt)) {
    throw new Error("opens_at không hợp lệ");
  }
  if (isMalformedScheduleAt(endsAt)) {
    throw new Error("ends_at không hợp lệ");
  }
  const openMs = opensAt ? scheduleToTimestampMs(opensAt) : null;
  const endMs = endsAt ? scheduleToTimestampMs(endsAt) : null;
  if (openMs != null && endMs != null && openMs >= endMs) {
    throw new Error("opens_at phải trước ends_at");
  }
}

/** Effective submission deadline: ends_at preferred, legacy closes_at fallback. */
export function effectiveEndsAt(exam: {
  ends_at?: string | null;
  closes_at?: string | null;
}): string | null {
  return exam.ends_at ?? exam.closes_at ?? null;
}

/** Thời lượng làm bài (phút) = ends_at − opens_at khi có lịch. */
export function durationMinFromSchedule(
  opensAt: string | null | undefined,
  endsAt: string | null | undefined
): number | null {
  const openMs = opensAt ? scheduleToTimestampMs(opensAt) : null;
  const endMs = endsAt ? scheduleToTimestampMs(endsAt) : null;
  if (openMs == null || endMs == null || endMs <= openMs) return null;
  const mins = Math.ceil((endMs - openMs) / 60_000);
  return Math.max(1, Math.min(300, mins));
}
