/** Chuẩn hóa key đáp án MCQ (A/B/C/D) để so khớp với options. */
export function answerKey(value: string | string[] | null | undefined): string | null {
  if (value == null) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === '') return null;
  return String(raw).trim().toUpperCase();
}

export function countMcqOptions(options: Record<string, string> | null | undefined): number {
  return options ? Object.keys(options).length : 0;
}
