import type { MockExamQuestion } from './types';

/** Dùng cho UI: câu được coi là “đã trả lời” khi có nhập/chọn tối thiểu. */
export function isQuestionAnswered(
  question: MockExamQuestion,
  answers: Record<string, string | string[]>,
): boolean {
  const qPrefix = `q${question.number}`;
  switch (question.type) {
    case 'mcq':
    case 'audio_mcq':
    case 'image_mcq': {
      const v = answers[qPrefix];
      return Array.isArray(v) ? v.length > 0 : Boolean(v);
    }
    case 'essay':
      return Boolean(String(answers[qPrefix] ?? '').trim());
    case 'fill_blank':
      return Boolean(
        question.fillSegments?.some((s) => {
          if (s.type !== 'blank') return false;
          return Boolean(String(answers[`${qPrefix}-${s.id}`] ?? '').trim());
        }),
      );
    case 'composite': {
      const parts = question.composite?.parts;
      if (!parts?.length) return false;
      return parts.some((part) => {
        const pk = `${qPrefix}-${part.id}`;
        const v = answers[pk];
        if (part.kind === 'mcq') return Array.isArray(v) ? v.length > 0 : Boolean(v);
        return Boolean(String(v ?? '').trim());
      });
    }
    default:
      return false;
  }
}
