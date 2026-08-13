import { reverseAnswer } from "~/models/examVersion.model";

/** Chuẩn hóa 1 chữ cái hoặc mảng chữ cái thành mảng chữ cái (A, B, C...) có sắp xếp */
export function normalizeLetterKeys(val: unknown): string[] {
  if (val == null) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr
    .map(String)
    .map((t) => t.trim().toUpperCase())
    .filter((t) => /^[A-Z]$/.test(t))
    .sort();
}

/** Tương thích ngược: chỉ lấy chữ cái đầu tiên */
export function normalizeLetterKey(val: unknown): string | null {
  const keys = normalizeLetterKeys(val);
  return keys.length > 0 ? keys[0] : null;
}

/** Đáp án đúng trong question bank — luôn là mảng chữ cái gốc. */
export function resolveCorrectAnswerKey(
  correct: string | string[] | null | undefined
): string[] {
  return normalizeLetterKeys(correct);
}

/** display_key (ô SV bấm) → original_key qua option_map. */
export function resolveOriginalKeyFromDisplay(
  displayKeysRaw: unknown,
  optionMap: Record<string, string>,
  originalOptions?: Record<string, string> | null
): string[] {
  const displayKeys = normalizeLetterKeys(displayKeysRaw);
  const resolved = displayKeys.map((pick) => {
    const rev = reverseAnswer(pick, optionMap, originalOptions);
    return normalizeLetterKey(rev) ?? pick;
  });
  return normalizeLetterKeys(resolved);
}

export interface McqGradeResult {
  isCorrect: boolean;
  originalKey: string[];
  correctKey: string[];
  displayKey: string[];
}

/**
 * Chấm TN: selected display keys → option_map → original_keys === correct_answers.
 * Trả về đúng nếu mảng trùng khớp 100%.
 */
export function gradeMcq(
  displayOrOriginalKey: unknown,
  correctAnswer: string | string[] | null | undefined,
  optionMap?: Record<string, string> | null,
  originalOptions?: Record<string, string> | null
): McqGradeResult {
  const correctKey = resolveCorrectAnswerKey(correctAnswer);
  const displayKey = normalizeLetterKeys(displayOrOriginalKey);

  if (correctKey.length === 0 || displayKey.length === 0) {
    return { isCorrect: false, originalKey: displayKey, correctKey, displayKey };
  }

  let originalKey = displayKey;
  if (optionMap && Object.keys(optionMap).length > 0) {
    originalKey = resolveOriginalKeyFromDisplay(displayKey, optionMap, originalOptions);
  }

  const isCorrect = originalKey.join(",") === correctKey.join(",");

  return {
    isCorrect,
    originalKey,
    correctKey,
    displayKey,
  };
}

export type RecomputeMcqInput =
  | { kind: "display"; key: string[] }
  | { kind: "original"; key: string[] };

export type PickRecomputeMcqOptions = {
  preferSubmittedSource?: boolean;
};

function pickDisplayByIndex(
  displayIdx: number,
  displayByIndex: Record<string, string>
): RecomputeMcqInput | null {
  const fromAutosave = displayByIndex[String(displayIdx)]?.trim();
  const keys = normalizeLetterKeys(fromAutosave ? fromAutosave.split(",") : []);
  if (keys.length > 0) {
    return { kind: "display", key: keys };
  }
  return null;
}

function pickOriginalByQuestion(
  questionId: string,
  originalByQuestionId: Record<string, string | string[]>,
  gradedDetailSubmitted?: unknown
): RecomputeMcqInput | null {
  const fromStudent = originalByQuestionId[questionId];
  let keys = normalizeLetterKeys(fromStudent);
  if (keys.length > 0) {
    return { kind: "original", key: keys };
  }
  keys = normalizeLetterKeys(gradedDetailSubmitted);
  if (keys.length > 0) return { kind: "original", key: keys };
  return null;
}

export function pickRecomputeMcqInput(
  displayIdx: number,
  questionId: string,
  displayByIndex: Record<string, string>,
  originalByQuestionId: Record<string, string | string[]>,
  gradedDetailSubmitted?: unknown,
  options?: PickRecomputeMcqOptions
): RecomputeMcqInput | null {
  const preferSubmitted = options?.preferSubmittedSource === true;
  const fromOriginal = pickOriginalByQuestion(
    questionId,
    originalByQuestionId,
    gradedDetailSubmitted
  );
  const fromDisplay = pickDisplayByIndex(displayIdx, displayByIndex);

  if (preferSubmitted) {
    return fromOriginal ?? fromDisplay;
  }
  return fromDisplay ?? fromOriginal;
}

export function gradeMcqRecompute(
  input: RecomputeMcqInput | null,
  correctAnswer: string | string[] | null | undefined,
  optionMap?: Record<string, string> | null,
  originalOptions?: Record<string, string> | null
): McqGradeResult {
  if (!input) {
    return gradeMcq(null, correctAnswer, optionMap, originalOptions);
  }
  if (input.kind === "display") {
    return gradeMcq(input.key, correctAnswer, optionMap, originalOptions);
  }
  const correctKey = resolveCorrectAnswerKey(correctAnswer);
  const originalKey = normalizeLetterKeys(input.key);
  return {
    isCorrect: Boolean(originalKey.length && correctKey.length && originalKey.join(",") === correctKey.join(",")),
    originalKey,
    correctKey,
    displayKey: [],
  };
}

export function mcqAnswersEqual(
  submittedOriginalKey: unknown,
  correctAnswer: string | string[] | null | undefined
): boolean {
  const sub = normalizeLetterKeys(submittedOriginalKey).join(",");
  const cor = resolveCorrectAnswerKey(correctAnswer).join(",");
  if (!sub || !cor) return false;
  return sub === cor;
}

function findMcqKeysByOptionText(
  answer: unknown,
  options?: Record<string, string> | null
): string[] {
  if (!options || answer == null) return [];
  const needles = (Array.isArray(answer) ? answer : [answer]).map(s => String(s).trim());
  const found: string[] = [];
  for (const needle of needles) {
    if (!needle) continue;
    for (const [key, label] of Object.entries(options)) {
      if (String(label).trim() === needle) {
        const k = normalizeLetterKey(key);
        if (k) found.push(k);
      }
    }
  }
  return normalizeLetterKeys(found);
}

export function resolveSubmittedOriginalKey(
  submitted: unknown,
  correctAnswer: string | string[] | null | undefined,
  optionMap?: Record<string, string> | null,
  originalOptions?: Record<string, string> | null
): string | string[] | null {
  const letters = normalizeLetterKeys(submitted);
  if (letters.length === 0) return null;
  if (!optionMap || Object.keys(optionMap).length === 0) return letters;

  const fromDisplay = resolveOriginalKeyFromDisplay(letters, optionMap, originalOptions);
  if (fromDisplay.length > 0 && mcqAnswersEqual(fromDisplay, correctAnswer)) return fromDisplay;
  if (mcqAnswersEqual(letters, correctAnswer)) return letters;
  return fromDisplay.length > 0 ? fromDisplay : letters;
}

export function resolveReviewCorrectKey(
  correctAnswer: string | string[] | null | undefined,
  options?: Record<string, string> | null,
  gradedDetailCorrect?: unknown
): string | string[] | null {
  const fromGraded = normalizeLetterKeys(gradedDetailCorrect);
  if (fromGraded.length > 0) return fromGraded;
  const fromQuestion = resolveCorrectAnswerKey(correctAnswer);
  if (fromQuestion.length > 0) return fromQuestion;
  const fromText = findMcqKeysByOptionText(correctAnswer, options);
  if (fromText.length > 0) return fromText;
  return resolveMcqAnswerKey(correctAnswer, options);
}

export function resolveMcqAnswerKey(
  answer: string | string[] | null | undefined,
  _options?: Record<string, string> | null
): string | string[] | null {
  const letters = normalizeLetterKeys(answer);
  if (letters.length > 0) return letters;
  const cor = resolveCorrectAnswerKey(answer);
  return cor.length > 0 ? cor : null;
}
