import { env } from "~/config/enviroment";
import {
  evaluateStudent,
  summaryFromPrediction,
} from "~/services/aiEvaluator.service";
import {
  loadModelWeights,
  predictGrade,
} from "~/services/gradePredictor.service";
import type { WrongItem } from "~/services/wrongAnswerBundle.service";
import {
  getGroupsForSubject,
  getPredictionTargets,
  loadGroupsFile,
  resolveSubjectId,
} from "~/utils/subjectGroups.util";

export type { WrongItem };

export interface JustCompleted {
  subject: string;
  score: number;
  grade: string;
  vs_class_avg?: string;
  analysis?: string;
}

export interface HistoryItem {
  subject: string;
  score: number;
  grade: string;
}

export interface PredictionRequest {
  student_id: string;
  student_name?: string;
  just_completed: JustCompleted;
  history: HistoryItem[];
  target_subjects?: string[];
}

export interface SubjectPrediction {
  subject: string;
  semester: number;
  credits: number;
  predicted_score: number;
  grade: string;
  confidence: number;
  trend: "up" | "stable" | "down";
  correlation_r: number;
  reasoning: string;
}

export interface ChapterInsight {
  chapter: number | null;
  label: string;
  wrong_count: number;
  question_numbers: number[];
}

/** Đánh giá kết quả học tập (Tầng 2 AI + số liệu Tầng 1). */
export interface LearningAssessment {
  remark: string;
  weaknesses: string[];
  advice: string[];
  comparison: string;
  quantitative?: {
    predicted_score: number;
    class_avg: number;
    percentile: number;
    predicted_grade: string;
  };
}

export interface PredictionResult {
  target_subject?: string;
  target_subject_id?: string;
  just_completed: JustCompleted;
  predictions: SubjectPrediction[];
  /** Đánh giá học lực — trọng tâm đề tài. */
  learning_assessment?: LearningAssessment;
  overall_advice: string;
  weak_chapters?: ChapterInsight[];
  wrong_summary?: WrongItem[];
  improvement?: string[];
}

function scoreToGrade(score: number): string {
  if (score >= 9) return "A+";
  if (score >= 8) return "A";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 5) return "D+";
  return "F";
}

function buildScoresMap(
  req: PredictionRequest,
  completedId: string | null
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const h of req.history) {
    const id = resolveSubjectId(h.subject);
    if (id && h.score > 0) scores[id] = h.score;
  }
  if (completedId && req.just_completed.score > 0) {
    scores[completedId] = req.just_completed.score;
  }
  return scores;
}

function gpaFromScores(scores: Record<string, number>, fallback: number): number {
  const vals = Object.values(scores).filter((v) => v > 0);
  if (vals.length === 0) return fallback;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function vsClassAvgText(score: number, classAvg: number): string {
  const diff = +(score - classAvg).toFixed(1);
  if (Math.abs(diff) < 0.05) return `bằng trung bình (${classAvg})`;
  if (diff > 0) return `cao hơn trung bình ${diff} điểm (ĐTB: ${classAvg})`;
  return `thấp hơn trung bình ${Math.abs(diff)} điểm (ĐTB: ${classAvg})`;
}

function formatChapterLabel(item: Pick<WrongItem, "chapter" | "chapter_label">): string {
  if (item.chapter_label && item.chapter != null) {
    return `Chương ${item.chapter} - ${item.chapter_label}`;
  }
  if (item.chapter_label) return item.chapter_label;
  if (item.chapter != null) return `Chương ${item.chapter}`;
  return "Chủ điểm chưa gán chương";
}

function normalizeLineKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^can cung co\s+/i, "")
    .replace(/[.:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = normalizeLineKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function buildWeakChapterInsights(wrongItems: WrongItem[]): ChapterInsight[] {
  const grouped = new Map<string, ChapterInsight>();
  for (const item of wrongItems) {
    const label = formatChapterLabel(item);
    const key = `${item.chapter ?? "none"}::${item.chapter_label ?? ""}`;
    const current = grouped.get(key);
    if (current) {
      current.wrong_count += 1;
      current.question_numbers.push(item.q);
      continue;
    }
    grouped.set(key, {
      chapter: item.chapter ?? null,
      label,
      wrong_count: 1,
      question_numbers: [item.q],
    });
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      question_numbers: [...item.question_numbers].sort((a, b) => a - b),
    }))
    .sort((a, b) => {
      const diff = b.wrong_count - a.wrong_count;
      if (diff !== 0) return diff;
      return (a.chapter ?? Number.MAX_SAFE_INTEGER) - (b.chapter ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, 3);
}

function buildChapterImprovementLines(chapters: ChapterInsight[]): string[] {
  return chapters.map((chapter) => {
    const refs = chapter.question_numbers.join(", ");
    return `${chapter.label}: nên ôn lại trước, sai ở các câu ${refs}.`;
  });
}

function buildChapterWeaknessLines(chapters: ChapterInsight[]): string[] {
  return chapters.map((chapter) => chapter.label);
}

function buildMathPredictions(
  targetNames: string[],
  scores: Record<string, number>,
  gpa: number,
  completedId: string | null
): SubjectPrediction[] {
  const weights = loadModelWeights();
  const out: SubjectPrediction[] = [];

  for (const name of targetNames) {
    const tid = resolveSubjectId(name);
    if (!tid) continue;
    try {
      const p = predictGrade({ subject_id: tid, scores, gpa });
      const model = weights.models[tid];
      let correlation_r = 0;
      if (completedId && model) {
        const hit = model.top_correlations.find(
          (c) => c.subject_id === completedId
        );
        correlation_r = hit?.r ?? 0;
      }
      const trend: SubjectPrediction["trend"] =
        p.vs_class_avg >= 0.3
          ? "up"
          : p.vs_class_avg <= -0.3
            ? "down"
            : "stable";
      out.push({
        subject: name,
        semester: 0,
        credits: weights.subject_meta[tid]?.credits ?? 0,
        predicted_score: p.predicted_score,
        grade: p.predicted_grade,
        confidence: p.confidence,
        trend,
        correlation_r,
        reasoning: "",
      });
    } catch {
      /* bỏ qua môn không predict được */
    }
  }
  return out;
}

async function fetchAiCommentary(
  req: PredictionRequest,
  groupLabels: string[],
  predictions: SubjectPrediction[],
  vsClassAvg: string,
  wrongItems: WrongItem[]
): Promise<{ analysis: string; overall_advice: string; improvement: string[] }> {
  const chapterInsights = buildWeakChapterInsights(wrongItems);
  const chapterImprovement = buildChapterImprovementLines(chapterInsights);
  const fallbackImprovement =
    chapterImprovement.length > 0
      ? chapterImprovement
      : wrongItems.length > 0
        ? wrongItems.map((w) => `Ôn lại nội dung câu ${w.q}`)
        : [];
  const fallback = {
    analysis: `Kết quả ${req.just_completed.grade} ở môn ${req.just_completed.subject}, ${vsClassAvg}.`,
    overall_advice:
      predictions.length > 0
        ? `Tập trung các môn cùng nhóm (${groupLabels.join(", ")}): ${predictions.map((p) => p.subject).join(", ")}.`
        : "Tiếp tục duy trì phong độ học tập.",
    improvement: fallbackImprovement,
  };
  if (!env.MINIMAX_API_KEY) return fallback;

  const predLines = predictions
    .map((p) => `${p.subject}: ${p.predicted_score}/10 (R²≈${Math.round(p.confidence * 100) / 100})`)
    .join("; ");

  const diagnosticPayload = {
    exam_subject: req.just_completed.subject,
    exam_score_10: req.just_completed.score,
    wrong_items: wrongItems,
    weak_chapters: chapterInsights.map((item) => ({
      chapter: item.chapter,
      label: item.label,
      wrong_count: item.wrong_count,
      question_numbers: item.question_numbers,
    })),
    predict_targets: predictions.map((p) => ({
      subject: p.subject,
      score_math: p.predicted_score,
      model_r2: p.confidence,
    })),
  };

  const prompt = `Bạn là giáo viên CNTT. Phân tích dựa trên JSON sau (câu trong wrong_items đã là câu SAI, không cần đáp án ABCD):
${JSON.stringify(diagnosticPayload)}

Quy tắc:
- KHÔNG đổi score_math trong predict_targets.
- Chỉ nhận xét môn trong predict_targets / nhóm: ${groupLabels.join(", ") || "—"}.
- improvement: ưu tiên gợi ý ôn theo weak_chapters; nếu cần mới tham chiếu stem/explanation_short (trích q nếu cần).
Trả CHỈ JSON: {"analysis":"1 câu về bài vừa thi","overall_advice":"1-2 câu","improvement":["gợi ý 1","gợi ý 2"]}`;

  const response = await fetch(`${env.MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.MINIMAX_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Trả lời ngắn tiếng Việt, chỉ JSON, không suy luận dài, không thêm môn ngoài nhóm.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 900,
    }),
  });

  if (!response.ok) return fallback;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match =
    raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/\{[\s\S]*\}/);
  const jsonStr = match ? (match[1] ?? match[0]) : raw;
  try {
    const parsed = JSON.parse(jsonStr.trim()) as {
      analysis?: string;
      overall_advice?: string;
      improvement?: string[];
    };
    const improvement = Array.isArray(parsed.improvement)
      ? parsed.improvement.filter((s) => typeof s === "string" && s.trim()).slice(0, 8)
      : fallback.improvement;
    return {
      analysis: parsed.analysis ?? fallback.analysis,
      overall_advice: parsed.overall_advice ?? fallback.overall_advice,
      improvement,
    };
  } catch {
    return fallback;
  }
}

export type PredictScoreOptions = {
  wrong_items?: WrongItem[];
};

export async function predictScore(
  req: PredictionRequest,
  options: PredictScoreOptions = {}
): Promise<PredictionResult> {
  const wrongItems = options.wrong_items ?? [];
  const chapterInsights = buildWeakChapterInsights(wrongItems);
  const chapterWeakness = buildChapterWeaknessLines(chapterInsights);
  const chapterImprovement = buildChapterImprovementLines(chapterInsights);
  const historyNames = req.history.map((h) => h.subject);
  const explicitTargets =
    req.target_subjects && req.target_subjects.length > 0
      ? req.target_subjects
      : null;

  const { targets, groupLabels, completedId } = explicitTargets
    ? (() => {
        const targetName = explicitTargets[0];
        const gids = getGroupsForSubject(targetName);
        const file = loadGroupsFile();
        const labels = gids
          .map((gid) => file.groups[gid]?.label)
          .filter((l): l is string => Boolean(l));
        return {
          targets: explicitTargets,
          groupLabels: labels,
          completedId: resolveSubjectId(req.just_completed.subject),
        };
      })()
    : getPredictionTargets(req.just_completed.subject, historyNames);

  const weights = loadModelWeights();
  const completedMeta = completedId
    ? weights.subject_meta[completedId]
    : null;
  const classAvg = completedMeta?.mean ?? req.just_completed.score;
  const vsClassAvg = vsClassAvgText(req.just_completed.score, classAvg);

  const scores = buildScoresMap(req, completedId);
  const gpa = gpaFromScores(scores, req.just_completed.score);
  const nCompleted = req.history.length + 1;

  const predictions = buildMathPredictions(
    targets,
    scores,
    gpa,
    completedId
  );

  const targetName =
    explicitTargets?.[0] ?? targets[0] ?? req.just_completed.subject;
  const targetId = resolveSubjectId(targetName);

  let learning_assessment: LearningAssessment | undefined;
  if (targetId) {
    try {
      const pred = predictGrade({ subject_id: targetId, scores, gpa });
      const evaluation = await evaluateStudent(
        summaryFromPrediction(
          pred,
          gpa,
          req.just_completed.score,
          nCompleted,
          chapterInsights.map((item) => item.label)
        )
      );
      const filteredWeaknesses = evaluation.weaknesses.filter((line) => {
        const key = normalizeLineKey(line);
        return !chapterWeakness.some((chapter) => normalizeLineKey(chapter) === key);
      });
      const filteredAdvice = evaluation.advice.filter((line) => {
        const key = normalizeLineKey(line);
        return !chapterWeakness.some((chapter) => normalizeLineKey(chapter) === key);
      });
      learning_assessment = {
        remark: evaluation.remark,
        weaknesses: dedupeLines(filteredWeaknesses).slice(0, 8),
        advice: dedupeLines([...chapterImprovement, ...filteredAdvice]).slice(0, 8),
        comparison: evaluation.comparison,
        quantitative: {
          predicted_score: pred.predicted_score,
          class_avg: pred.class_avg,
          percentile: pred.percentile,
          predicted_grade: pred.predicted_grade,
        },
      };
    } catch {
      /* fallback commentary bên dưới */
    }
  }

  const commentary =
    learning_assessment == null
      ? await fetchAiCommentary(
          req,
          groupLabels,
          predictions,
          vsClassAvg,
          wrongItems
        )
      : {
          analysis: learning_assessment.remark,
          overall_advice: [
            learning_assessment.comparison,
            ...learning_assessment.advice,
          ]
            .filter(Boolean)
            .join(" "),
          improvement: [
            ...learning_assessment.weaknesses,
            ...learning_assessment.advice,
          ].slice(0, 8),
        };

  const fallbackWrongImprovement =
    chapterImprovement.length > 0
      ? chapterImprovement
      : wrongItems.length > 0
        ? wrongItems.map((w) => `Ôn lại nội dung câu ${w.q}`)
        : [];
  const improvement = learning_assessment
    ? dedupeLines(learning_assessment.advice)
    : dedupeLines([...commentary.improvement, ...fallbackWrongImprovement]);

  return {
    just_completed: {
      subject: req.just_completed.subject,
      score: req.just_completed.score,
      grade: req.just_completed.grade,
      vs_class_avg: vsClassAvg,
      analysis: commentary.analysis,
    },
    predictions,
    learning_assessment,
    overall_advice:
      predictions.length === 0
        ? `Môn "${req.just_completed.subject}" thuộc nhóm ${groupLabels.join(", ") || "chưa phân loại"}. ${commentary.overall_advice}`
        : commentary.overall_advice,
    weak_chapters: chapterInsights.length > 0 ? chapterInsights : undefined,
    wrong_summary: wrongItems.length > 0 ? wrongItems : undefined,
    improvement: improvement.length > 0 ? improvement : undefined,
  };
}
