import { getQuestionsByExam } from "~/models/question.model";
import type { ExamSession } from "~/models/examsession.model";
import type { GradedDetailRow } from "~/services/exam.service";

export const MAX_WRONG_ITEMS = 5;
const MAX_STEM_LEN = 200;
const MAX_EXPLANATION_LEN = 120;

export interface WrongItem {
  q: number;
  stem: string;
  difficulty?: "DE" | "TRUNGBINH" | "KHO";
  chapter?: number | null;
  chapter_label?: string | null;
  explanation_short?: string;
}

function parseGradedDetails(raw: unknown): GradedDetailRow[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as GradedDetailRow[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as GradedDetailRow[];
  return [];
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

/**
 * Gom câu sai từ phiên thi mới nhất — chỉ stem + gợi ý (không gửi đáp án A/B/C/D).
 */
export async function buildWrongAnswerBundle(
  session: Pick<ExamSession, "exam_id" | "graded_details">,
  limit = MAX_WRONG_ITEMS
): Promise<WrongItem[]> {
  const details = parseGradedDetails(session.graded_details);
  const wrongRows = details.filter(
    (d) =>
      !d.is_correct &&
      !d.pending_grading &&
      d.question_type !== "essay"
  );
  if (wrongRows.length === 0) return [];

  const questions = await getQuestionsByExam(session.exam_id);
  const byId = new Map(questions.map((q, idx) => [q.id, { q, order: idx + 1 }]));

  const ranked = wrongRows
    .map((d) => {
      const meta = byId.get(d.question_id);
      return { d, meta, points: d.max_points ?? meta?.q.points ?? 0 };
    })
    .filter((x) => x.meta)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);

  const out: WrongItem[] = [];
  for (const { d, meta } of ranked) {
    if (!meta) continue;
    const stem = truncate(stripHtml(meta.q.content), MAX_STEM_LEN);
    const expl = meta.q.explanation?.trim();
    const item: WrongItem = {
      q: meta.order,
      stem,
      difficulty: meta.q.difficulty,
      chapter: meta.q.chapter ?? null,
      chapter_label: meta.q.chapter_label ?? null,
    };
    if (expl) {
      item.explanation_short = truncate(stripHtml(expl), MAX_EXPLANATION_LEN);
    }
    out.push(item);
  }
  return out;
}
