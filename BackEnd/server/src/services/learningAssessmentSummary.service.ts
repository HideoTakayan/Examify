import type { Question, QuestionDifficulty } from "~/models/question.model";
import type { GradedDetailRow } from "~/services/exam.service";

export type AssessmentSummaryMode =
  | "full_wrong_details"
  | "chapter_samples"
  | "summary_only"
  | "all_wrong_summary";

export interface AssessmentWrongItem {
  q: number;
  stem: string;
  chapter: number | null;
  chapter_label: string | null;
  difficulty: QuestionDifficulty;
  explanation_short?: string;
}

export interface ChapterAssessmentSummary {
  chapter: number | null;
  chapter_label: string | null;
  total: number;
  wrong: number;
  wrong_rate: number;
  easy_wrong: number;
  medium_wrong: number;
  hard_wrong: number;
}

export interface LearningAssessmentSummary {
  total_questions: number;
  wrong_count: number;
  wrong_rate: number;
  mode: AssessmentSummaryMode;
  chapter_summary: ChapterAssessmentSummary[];
  representative_wrong_items: AssessmentWrongItem[];
}

const MAX_STEM_LEN = 200;
const MAX_EXPLANATION_LEN = 120;

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function difficultyWeight(difficulty: QuestionDifficulty): number {
  if (difficulty === "DE") return 3;
  if (difficulty === "TRUNGBINH") return 2;
  return 1;
}

function resolveMode(wrongCount: number, totalQuestions: number): AssessmentSummaryMode {
  if (totalQuestions > 0 && wrongCount === totalQuestions) return "all_wrong_summary";
  const wrongRate = totalQuestions > 0 ? wrongCount / totalQuestions : 0;
  if (wrongRate < 0.3) return "full_wrong_details";
  if (wrongRate < 0.7) return "chapter_samples";
  return "summary_only";
}

export function buildLearningAssessmentSummary(
  allQuestions: Question[],
  gradedDetails: GradedDetailRow[]
): LearningAssessmentSummary {
  const questionsById = new Map(allQuestions.map((q, idx) => [q.id, { q, order: idx + 1 }]));
  const totalQuestions = allQuestions.length;
  const wrongRows = gradedDetails
    .filter((d) => !d.is_correct && !d.pending_grading && d.question_type !== "essay")
    .map((detail) => {
      const meta = questionsById.get(detail.question_id);
      return meta ? { detail, ...meta } : null;
    })
    .filter(Boolean) as Array<{ detail: GradedDetailRow; q: Question; order: number }>;

  const wrongCount = wrongRows.length;
  const wrongRate = totalQuestions > 0 ? wrongCount / totalQuestions : 0;
  const mode = resolveMode(wrongCount, totalQuestions);

  const chapterMap = new Map<string, ChapterAssessmentSummary>();
  for (const question of allQuestions) {
    const key = `${question.chapter ?? "null"}|${question.chapter_label ?? ""}`;
    const existing = chapterMap.get(key) ?? {
      chapter: question.chapter ?? null,
      chapter_label: question.chapter_label ?? null,
      total: 0,
      wrong: 0,
      wrong_rate: 0,
      easy_wrong: 0,
      medium_wrong: 0,
      hard_wrong: 0,
    };
    existing.total += 1;
    chapterMap.set(key, existing);
  }

  for (const row of wrongRows) {
    const key = `${row.q.chapter ?? "null"}|${row.q.chapter_label ?? ""}`;
    const bucket = chapterMap.get(key);
    if (!bucket) continue;
    bucket.wrong += 1;
    if (row.q.difficulty === "DE") bucket.easy_wrong += 1;
    else if (row.q.difficulty === "TRUNGBINH") bucket.medium_wrong += 1;
    else bucket.hard_wrong += 1;
  }

  const chapterSummary = [...chapterMap.values()]
    .map((item) => ({
      ...item,
      wrong_rate: item.total > 0 ? Number((item.wrong / item.total).toFixed(3)) : 0,
    }))
    .filter((item) => item.wrong > 0)
    .sort((a, b) => {
      if (b.wrong !== a.wrong) return b.wrong - a.wrong;
      if (b.wrong_rate !== a.wrong_rate) return b.wrong_rate - a.wrong_rate;
      return (a.chapter ?? 999) - (b.chapter ?? 999);
    });

  const rankedWrongItems = wrongRows
    .slice()
    .sort((a, b) => {
      const chapterA = chapterSummary.find(
        (item) => item.chapter === a.q.chapter && item.chapter_label === (a.q.chapter_label ?? null)
      );
      const chapterB = chapterSummary.find(
        (item) => item.chapter === b.q.chapter && item.chapter_label === (b.q.chapter_label ?? null)
      );
      const bucketA = chapterA?.wrong ?? 0;
      const bucketB = chapterB?.wrong ?? 0;
      if (bucketB !== bucketA) return bucketB - bucketA;
      const weightDiff = difficultyWeight(a.q.difficulty) - difficultyWeight(b.q.difficulty);
      if (weightDiff !== 0) return weightDiff;
      return Number(b.q.points) - Number(a.q.points);
    });

  let representativeWrongItems: AssessmentWrongItem[] = [];
  if (mode === "full_wrong_details") {
    representativeWrongItems = rankedWrongItems.map((row) => ({
      q: row.order,
      stem: truncate(stripHtml(row.q.content), MAX_STEM_LEN),
      chapter: row.q.chapter ?? null,
      chapter_label: row.q.chapter_label ?? null,
      difficulty: row.q.difficulty,
      explanation_short: row.q.explanation
        ? truncate(stripHtml(row.q.explanation), MAX_EXPLANATION_LEN)
        : undefined,
    }));
  } else {
    const maxChapters = Math.min(3, chapterSummary.length);
    const maxSamplesPerChapter = mode === "chapter_samples" ? 2 : 1;
    const selected: AssessmentWrongItem[] = [];
    for (const chapter of chapterSummary.slice(0, maxChapters)) {
      const rowsForChapter = rankedWrongItems
        .filter(
          (row) =>
            (row.q.chapter ?? null) === chapter.chapter &&
            (row.q.chapter_label ?? null) === chapter.chapter_label
        )
        .slice(0, maxSamplesPerChapter);
      for (const row of rowsForChapter) {
        selected.push({
          q: row.order,
          stem: truncate(stripHtml(row.q.content), MAX_STEM_LEN),
          chapter: row.q.chapter ?? null,
          chapter_label: row.q.chapter_label ?? null,
          difficulty: row.q.difficulty,
          explanation_short: row.q.explanation
            ? truncate(stripHtml(row.q.explanation), MAX_EXPLANATION_LEN)
            : undefined,
        });
      }
    }
    representativeWrongItems = selected;
  }

  return {
    total_questions: totalQuestions,
    wrong_count: wrongCount,
    wrong_rate: Number(wrongRate.toFixed(3)),
    mode,
    chapter_summary: chapterSummary,
    representative_wrong_items: representativeWrongItems,
  };
}
