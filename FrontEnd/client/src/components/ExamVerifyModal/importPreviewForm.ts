import type { ImportedQuestionDraft } from '@/services/examApi';

export type ImportQuestionRowForm = {
  content: string;
  question_type: 'mcq' | 'essay';
  points: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct_answer: string;
  difficulty: 'DE' | 'TRUNGBINH' | 'KHO';
  chapter: number | null;
  chapter_label?: string | null;
  answer_hint: string;
  display_order: number;
  ai_confidence?: number;
  needs_review?: boolean;
  review_reason?: string | null;
  media?: ImportedQuestionDraft['media'];
  media_url?: string | null;
};

export type ImportPreviewFormValues = {
  questions: ImportQuestionRowForm[];
};

export function draftToFormRow(q: ImportedQuestionDraft): ImportQuestionRowForm {
  const correct = q.correct_answer;
  return {
    content: q.content,
    question_type: q.question_type === 'essay' ? 'essay' : 'mcq',
    points: q.points,
    optionA: q.options?.A ?? '',
    optionB: q.options?.B ?? '',
    optionC: q.options?.C ?? '',
    optionD: q.options?.D ?? '',
    correct_answer: Array.isArray(correct) ? correct.join(',') : (correct ?? '') || '',
    difficulty: q.difficulty ?? 'DE',
    chapter: q.chapter ?? null,
    chapter_label: q.chapter_label ?? null,
    answer_hint: q.answer_hint ?? '',
    display_order: q.display_order,
    ai_confidence: q.ai_confidence,
    needs_review: q.needs_review,
    review_reason: q.review_reason,
    media: q.media ?? null,
    media_url: q.media_url ?? q.media?.url ?? null,
  };
}

export function formRowToDraft(row: ImportQuestionRowForm): ImportedQuestionDraft {
  const isMcq = row.question_type === 'mcq';
  const options = isMcq
    ? {
        A: row.optionA,
        B: row.optionB,
        C: row.optionC,
        D: row.optionD,
      }
    : null;

  return {
    content: row.content,
    question_type: row.question_type,
    points: row.points,
    options,
    correct_answer: isMcq ? row.correct_answer || null : null,
    display_order: row.display_order,
    difficulty: row.difficulty,
    chapter: row.chapter ?? null,
    chapter_label: row.chapter_label ?? null,
    answer_hint: isMcq ? null : row.answer_hint || null,
    media: row.media ?? null,
    media_url: row.media_url ?? row.media?.url ?? null,
    ai_confidence: row.ai_confidence,
    needs_review: row.needs_review,
    review_reason: row.review_reason,
  };
}

export function draftsToFormValues(questions: ImportedQuestionDraft[]): ImportPreviewFormValues {
  return { questions: questions.map(draftToFormRow) };
}
