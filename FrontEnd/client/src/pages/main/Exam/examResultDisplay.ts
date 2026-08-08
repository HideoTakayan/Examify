/** Hiển thị kết quả: tách trắc nghiệm (đúng/sai) và tự luận (điểm do GV chấm). */

export type EssayGradeState = 'pending' | 'partial' | 'full' | 'zero' | 'unanswered';

export type ResultQuestionLike = {
  question_type: 'mcq' | 'essay';
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
  submitted?: string | string[] | null;
};

export function getEssayGradeState(q: ResultQuestionLike): EssayGradeState {
  if (q.question_type !== 'essay') return 'pending';
  if (q.pending_grading || q.points_earned == null) return 'pending';
  const submitted = q.submitted;
  const hasAnswer =
    submitted != null &&
    submitted !== '' &&
    !(Array.isArray(submitted) && submitted.length === 0);
  if (!hasAnswer) return 'unanswered';
  if (q.points_earned <= 0) return 'zero';
  if (q.points_earned >= q.max_points) return 'full';
  return 'partial';
}

export function getQuestionStatusColor(q: ResultQuestionLike): string {
  if (isQuestionFullyCorrect(q)) return 'green';
  if (q.question_type === 'essay') {
    const st = getEssayGradeState(q);
    if (st === 'pending') return 'yellow';
    if (st === 'partial') return 'yellow';
    return 'red';
  }
  if (q.pending_grading) return 'yellow';
  return 'red';
}

export function getQuestionStatusIcon(q: ResultQuestionLike): 'check' | 'x' | 'clock' | 'partial' {
  if (isQuestionFullyCorrect(q)) return 'check';
  if (q.question_type === 'essay') {
    const st = getEssayGradeState(q);
    if (st === 'pending') return 'clock';
    if (st === 'partial') return 'partial';
    return 'x';
  }
  if (q.pending_grading) return 'clock';
  return 'x';
}

/** Đúng khi và chỉ khi đạt đủ điểm tối đa của câu (TN hoặc TL đã chấm xong). */
export function isQuestionFullyCorrect(q: ResultQuestionLike): boolean {
  if (q.pending_grading || q.points_earned == null) return false;
  return Number(q.points_earned) >= Number(q.max_points);
}

export function countFullyCorrectQuestions(questions: ResultQuestionLike[]): number {
  return questions.filter(isQuestionFullyCorrect).length;
}

/** @deprecated dùng countFullyCorrectQuestions */
export function countMcqCorrect(questions: ResultQuestionLike[]): number {
  return countFullyCorrectQuestions(questions.filter((q) => q.question_type === 'mcq'));
}

export function sumMcqScore(questions: ResultQuestionLike[]): { earned: number; max: number } {
  const mcq = questions.filter((q) => q.question_type === 'mcq');
  return {
    earned: mcq.reduce((s, q) => s + (q.points_earned ?? 0), 0),
    max: mcq.reduce((s, q) => s + q.max_points, 0),
  };
}

export function sumEssayScore(questions: ResultQuestionLike[]): {
  earned: number | null;
  max: number;
  pendingCount: number;
} {
  const essays = questions.filter((q) => q.question_type === 'essay');
  const pendingCount = essays.filter((q) => q.pending_grading || q.points_earned == null).length;
  if (essays.length === 0) return { earned: null, max: 0, pendingCount: 0 };
  const max = essays.reduce((s, q) => s + q.max_points, 0);
  if (pendingCount > 0) return { earned: null, max, pendingCount };
  const earned = essays.reduce((s, q) => s + (q.points_earned ?? 0), 0);
  return { earned, max, pendingCount: 0 };
}

export function getTotalScorePercent(score: number | null, max: number | null): number | null {
  if (max == null || max <= 0 || score == null) return null;
  return Math.round((score / max) * 100);
}

export function getMcqAccuracyPercent(questions: ResultQuestionLike[]): number | null {
  const mcq = questions.filter((q) => q.question_type === 'mcq');
  if (mcq.length === 0) return null;
  const { earned, max } = sumMcqScore(questions);
  if (max <= 0) return null;
  return Math.round((earned / max) * 100);
}

/** Tỷ lệ câu đạt đủ điểm tối đa / tổng số câu. */
export function getFullyCorrectPercent(questions: ResultQuestionLike[]): number | null {
  if (questions.length === 0) return null;
  const correct = countFullyCorrectQuestions(questions);
  return Math.round((correct / questions.length) * 100);
}

export function hasPartialCreditEssay(questions: ResultQuestionLike[]): boolean {
  return questions.some(
    (q) => q.question_type === 'essay' && getEssayGradeState(q) === 'partial'
  );
}

export type SummaryResultTone = 'all_correct' | 'mixed' | 'all_wrong';

/** Màu/icon tóm tắt: vàng khi có TL điểm một phần (không sai hẳn, chưa đủ max). */
export function getSummaryResultTone(questions: ResultQuestionLike[]): SummaryResultTone {
  if (questions.length === 0) return 'all_wrong';
  const full = countFullyCorrectQuestions(questions);
  if (full === questions.length) return 'all_correct';
  if (full > 0 || hasPartialCreditEssay(questions)) return 'mixed';
  return 'all_wrong';
}
