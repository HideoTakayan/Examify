import { type Question as ApiQuestion, type StartSessionData } from '@/services/examApi';
import type { MockExamQuestion } from '@/components/ExamTake/types';

export function formatHms(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
}

export function toUiQuestion(question: ApiQuestion, number: number): MockExamQuestion {
  const media_url = question.media_url?.trim() ? question.media_url : null;

  const options = Object.entries(question.options ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rawLabel]) => {
      let label = '';
      if (typeof rawLabel === 'string') {
        label = rawLabel;
      } else if (rawLabel && typeof rawLabel === 'object') {
        const nested = (rawLabel as Record<string, unknown>)[key];
        label = typeof nested === 'string' ? nested : JSON.stringify(rawLabel);
      } else if (rawLabel != null) {
        label = String(rawLabel);
      }
      return { key, label };
    });

  return {
    number,
    points: question.points,
    type: question.question_type as MockExamQuestion['type'],
    prompt: question.content,
    media_url,
    options,
  };
}

/** Câu hỏi từ startSession — đúng mã đề (D01/D02), đã xáo thứ tự/đáp án */
export function mapSessionQuestionsToUi(questionData: StartSessionData['questions']): {
  questions: MockExamQuestion[];
  idMap: Record<number, string>;
} {
  const mappedQuestions = questionData.map((q, idx) =>
    toUiQuestion(
      {
        id: q.id,
        exam_id: '',
        content: q.content,
        question_type: q.question_type,
        options: q.options,
        points: q.points,
        media_url: q.media_url ?? null,
        created_at: '',
      },
      idx + 1
    )
  );
  const idMap: Record<number, string> = {};
  for (let i = 0; i < questionData.length; i += 1) {
    idMap[i + 1] = questionData[i].id;
  }
  return { questions: mappedQuestions, idMap };
}

export function buildSubmitAnswers(
  answers: Record<string, string | string[]>,
  questionIdByNumber: Record<number, string>,
  questionByNumber: Map<number, MockExamQuestion>,
): Record<string, string | string[]> {
  const payload: Record<string, string | string[]> = {};

  for (const rawNumber of Object.keys(questionIdByNumber)) {
    const number = Number(rawNumber);
    const displayIdx = String(number - 1);
    const question = questionByNumber.get(number);
    if (!question) continue;

    const answerKey = `q${number}`;
    const rawAnswer = answers[answerKey];

    if (question.type === 'mcq' && rawAnswer) {
      if (Array.isArray(rawAnswer) ? rawAnswer.length > 0 : Boolean(rawAnswer)) {
        payload[displayIdx] = rawAnswer;
      }
    } else if (question.type === 'msq' && rawAnswer) {
      if (Array.isArray(rawAnswer) && rawAnswer.length > 0) {
        payload[displayIdx] = rawAnswer;
      }
    } else if (question.type === 'fib' && rawAnswer) {
      if (typeof rawAnswer === 'string' && rawAnswer.trim()) {
        payload[displayIdx] = rawAnswer.trim();
      }
    }
  }

  return payload;
}
