/**
 * Controller cho kiến trúc 3 tầng dự đoán điểm.
 *
 * Endpoints:
 *   POST /v1/grade-predictor/predict        → Tầng 1: predict pure-math (KHÔNG gọi AI)
 *   POST /v1/grade-predictor/evaluate       → Tầng 2: chỉ gọi AI nhận xét (input đã nén sẵn)
 *   POST /v1/grade-predictor/full-report    → Tầng 1 + Tầng 2: báo cáo tổng hợp
 *   GET  /v1/grade-predictor/model-info     → metadata về model_weights.json đang dùng
 */

import { Request, Response, NextFunction } from "express";
import {
  loadModelWeights,
  predictGrade,
  type PredictInput,
} from "~/services/gradePredictor.service";
import {
  evaluateStudent,
  summaryFromPrediction,
  type EvaluationSummary,
} from "~/services/aiEvaluator.service";

// ============== Validation helpers ==============
function validatePredictInput(body: unknown): PredictInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Body phải là JSON object");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.subject_id !== "string" || !b.subject_id.trim()) {
    throw new Error("Thiếu hoặc sai 'subject_id' (vd: 'S52')");
  }
  if (typeof b.scores !== "object" || b.scores === null) {
    throw new Error("Thiếu hoặc sai 'scores' (object map subject_id → score)");
  }
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(b.scores as Record<string, unknown>)) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`Điểm cho ${k} không phải số`);
    }
    if (v < 0 || v > 10) throw new Error(`Điểm cho ${k} ngoài [0, 10]`);
    scores[k] = v;
  }
  const gpa =
    typeof b.gpa === "number" && Number.isFinite(b.gpa) ? b.gpa : undefined;
  return { subject_id: b.subject_id.trim(), scores, gpa };
}

function validateEvaluationSummary(body: unknown): EvaluationSummary {
  if (typeof body !== "object" || body === null) {
    throw new Error("Body phải là JSON object");
  }
  const b = body as Record<string, unknown>;
  const req = (k: string) => {
    if (!(k in b)) throw new Error(`Thiếu field '${k}'`);
  };
  ["student_gpa", "subject", "predicted_score", "class_avg", "percentile"].forEach(req);

  return {
    student_gpa: Number(b.student_gpa),
    subject: String(b.subject),
    subject_groups: Array.isArray(b.subject_groups)
      ? (b.subject_groups as unknown[]).map(String)
      : undefined,
    predicted_score: Number(b.predicted_score),
    class_avg: Number(b.class_avg),
    percentile: Number(b.percentile),
    weak_topics: Array.isArray(b.weak_topics)
      ? (b.weak_topics as unknown[]).map(String)
      : [],
    weak_groups: Array.isArray(b.weak_groups)
      ? (b.weak_groups as Array<Record<string, unknown>>).map((g) => ({
          label: String(g.label),
          diff: Number(g.diff),
        }))
      : undefined,
    strong_groups: Array.isArray(b.strong_groups)
      ? (b.strong_groups as Array<Record<string, unknown>>).map((g) => ({
          label: String(g.label),
          diff: Number(g.diff),
        }))
      : undefined,
    exam_score:
      typeof b.exam_score === "number" ? b.exam_score : undefined,
  };
}

// ============== Handlers ==============
/** TẦNG 1: dự đoán bằng math, KHÔNG gọi AI. Rẻ, nhanh, có thể gọi liên tục. */
export const predictGradeController = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = validatePredictInput(req.body);
    const result = predictGrade(input);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/** TẦNG 2: nhận summary đã nén, gọi AI lấy nhận xét. */
export const evaluateStudentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const summary = validateEvaluationSummary(req.body);
    const result = await evaluateStudent(summary);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error) {
      const code = err.message.startsWith("MiniMax") ? 502 : 400;
      return res.status(code).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * Full report: Tầng 1 (predict) + Tầng 2 (AI nhận xét) trong 1 lần gọi.
 * Body: { scores, subject_id, gpa?, exam_score? }
 */
export const fullReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = validatePredictInput(req.body);
    const examScore =
      typeof req.body?.exam_score === "number" ? req.body.exam_score : undefined;

    // Tầng 1
    const prediction = predictGrade(input);
    const gpa =
      typeof input.gpa === "number"
        ? input.gpa
        : Object.values(input.scores).filter((v) => v > 0).reduce((a, b, _i, arr) => a + b / arr.length, 0);

    // Tầng 2
    const summary = summaryFromPrediction(prediction, gpa, examScore);
    const evaluation = await evaluateStudent(summary);

    res.json({
      success: true,
      data: {
        prediction,
        evaluation,
        summary_sent_to_ai: summary,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      const code = err.message.startsWith("MiniMax") ? 502 : 400;
      return res.status(code).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/** Trả về metadata của model_weights.json (debug & admin). */
export const modelInfoController = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const m = loadModelWeights();
    const r2List = Object.values(m.models).map((x) => x.r2);
    r2List.sort((a, b) => b - a);
    const median =
      r2List.length === 0 ? 0 : r2List[Math.floor(r2List.length / 2)];

    res.json({
      success: true,
      data: {
        version: m.version,
        trained_at: m.trained_at,
        class: m.class,
        n_students: m.n_students,
        n_subjects_total: Object.keys(m.subject_meta).length,
        n_models_trained: Object.keys(m.models).length,
        n_groups: Object.keys(m.groups).length,
        global_stats: m.global_stats,
        groups: Object.entries(m.groups).map(([id, g]) => ({
          id,
          label: g.label,
          n_subjects: g.n_subjects,
          mean: g.mean,
          std: g.std,
          rule: g.rule ?? null,
        })),
        r2_summary: {
          best: r2List[0] ?? 0,
          median,
          worst: r2List[r2List.length - 1] ?? 0,
        },
        subjects: Object.entries(m.subject_meta).map(([id, meta]) => ({
          id,
          name: meta.name,
          credits: meta.credits,
          groups: meta.groups,
          class_avg: meta.mean,
          has_model: id in m.models,
          model_r2: m.models[id]?.r2 ?? null,
        })),
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(500).json({ success: false, message: err.message });
    }
    next(err);
  }
};
