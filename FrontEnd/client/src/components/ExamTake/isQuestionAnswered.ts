import type { MockExamQuestion } from './types';

/** Dùng cho UI: câu được coi là “đã trả lời” khi có nhập/chọn tối thiểu. */
export function isQuestionAnswered(
  question: MockExamQuestion,
  answers: Record<string, string>,
): boolean {
  const qPrefix = `q${question.number}`;
  switch (question.type) {
    case 'mcq':
    case 'audio_mcq':
    case 'image_mcq':
      return Boolean(answers[qPrefix]);
    case 'essay':
      return Boolean(answers[qPrefix]?.trim());
    case 'fill_blank':
      return Boolean(
        question.fillSegments?.some((s) => {
          if (s.type !== 'blank') return false;
          return Boolean(answers[`${qPrefix}-${s.id}`]?.trim());
        }),
      );
    case 'composite': {
      const parts = question.composite?.parts;
      if (!parts?.length) return false;
      return parts.some((part) => {
        const pk = `${qPrefix}-${part.id}`;
        if (part.kind === 'mcq') return Boolean(answers[pk]);
        return Boolean(answers[pk]?.trim());
      });
    }
    default:
      return false;
  }
}
