/** Milliseconds since epoch, or null if string is not a finite instant. */
export function closesAtToTimestampMs(closesAt: string): number | null {
  const t = new Date(closesAt).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Non-empty value that does not parse to a finite instant. */
export function isMalformedClosesAt(closesAt: string | null | undefined): boolean {
  if (closesAt === undefined || closesAt === null || closesAt === "") return false;
  return closesAtToTimestampMs(closesAt) === null;
}

export function isPastClosesAt(closesAt: string, nowMs: number): boolean {
  const limit = closesAtToTimestampMs(closesAt);
  if (limit === null) return false;
  return nowMs > limit;
}

export function normalizeClosesAtInput(
  closesAt: string | null | undefined
): string | null {
  if (closesAt === undefined || closesAt === null || closesAt === "") return null;
  return closesAt;
}
