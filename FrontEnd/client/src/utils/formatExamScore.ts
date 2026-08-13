/** Hiển thị điểm (tránh 36.39999999999999 → 36.4). */
export function formatExamScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}



function scoreToGrade10(
  score: number | null | undefined,
  maxPoints: number | null | undefined
): number | null {
  if (score == null || maxPoints == null || Number(maxPoints) <= 0) return null;
  return Math.round((Number(score) / Number(maxPoints)) * 100) / 10;
}

export function formatScoreScale10Pair(
  score: number | null | undefined,
  maxPoints: number | null | undefined
): string {
  const g10 = scoreToGrade10(score, maxPoints);
  if (g10 == null) return '—';
  const label = Number.isInteger(g10) ? String(g10) : g10.toFixed(1);
  return `${label}/10`;
}

export function scoreToPointPercent(
  score: number | null | undefined,
  maxPoints: number | null | undefined
): number | null {
  if (score == null || maxPoints == null || Number(maxPoints) <= 0) return null;
  return Math.round((Number(score) / Number(maxPoints)) * 1000) / 10;
}

/** Sửa điểm lỗi float trong nội dung thông báo đã lưu (vd. 36.39999999999999/41). */
export function sanitizeScoreInText(text: string): string {
  let out = text.replace(/(\d+\.\d{4,})(\/\d+(?:\.\d+)?)/g, (_, raw: string, rest: string) => {
    const rounded = Math.round(parseFloat(raw) * 10) / 10;
    const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${label}${rest}`;
  });
  out = out.replace(
    /Điểm:\s*(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g,
    (_, s: string, max: string) => `Điểm: ${formatScoreScale10Pair(parseFloat(s), parseFloat(max))}`
  );
  return out;
}
