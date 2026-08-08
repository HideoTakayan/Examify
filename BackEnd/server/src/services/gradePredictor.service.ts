/**
 * TẦNG 1 — Dự đoán điểm bằng PURE MATH (KHÔNG gọi AI)
 *
 * Input gọn:  { gpa, scores: { S07: 7.0, ... }, subject_id: "S52" }
 * Output:     { predicted_score, percentile, vs_class_avg, weak_subjects, ... }
 *
 * Thuật toán:
 *   predicted = intercept + Σ feature_coeff_i * score_of_feature_i
 *   (impute mean lớp nếu thiếu điểm feature)
 *
 * Trọng số được nạp 1 lần (singleton) từ src/data/model_weights.json
 * — file do scripts/train-grade-predictor.ts sinh ra.
 */

import fs from "node:fs";
import path from "node:path";

// ============== Schema khớp với model_weights.json (v2) ==============
export interface SubjectModel {
  name: string;
  features: string[];
  feature_names: string[];
  feature_groups: string[][];
  uses_gpa: boolean;
  coeffs: number[]; // [feature_1_coeff, feature_2_coeff, ...] hoặc tương thích cũ nếu uses_gpa=true
  intercept: number;
  r2: number;
  n_train: number;
  groups: string[];
  top_correlations: Array<{
    subject_id: string;
    name: string;
    r: number;
    same_group: boolean;
  }>;
}

export interface SubjectMetaEntry {
  name: string;
  credits: number;
  cluster: string;
  groups: string[];
  mean: number;
  std: number;
  n: number;
}

export interface GroupStatsEntry {
  label: string;
  subjects: string[];
  mean: number;
  std: number;
  n_subjects: number;
  rule?: string;
}

export interface ModelWeightsFile {
  version: string;
  trained_at: string;
  class: string;
  n_students: number;
  global_stats: { overall_mean: number; overall_std: number };
  subject_meta: Record<string, SubjectMetaEntry>;
  groups: Record<string, GroupStatsEntry>;
  models: Record<string, SubjectModel>;
}

// ============== Input/Output API ==============
export interface PredictInput {
  /** Giữ tương thích API cũ; model hiện tại không bắt buộc dùng GPA. */
  gpa?: number;
  /** Bảng điểm đã có của SV: { subject_id: score }. Điểm 0 hoặc thiếu coi như chưa học. */
  scores: Record<string, number>;
  /** Mã môn cần dự đoán. */
  subject_id: string;
}

export interface PredictOutput {
  subject_id: string;
  subject_name: string;
  subject_groups: string[]; // các nhóm môn target thuộc về
  predicted_score: number; // 0-10
  predicted_grade: string; // A+, A, B, ...
  class_avg: number;
  class_std: number;
  vs_class_avg: number; // hiệu = predicted - class_avg
  percentile: number; // 0-100, dùng phân phối chuẩn quanh class
  confidence: number; // 0-1, lấy từ R² của model
  features_used: Array<{
    subject_id: string;
    name: string;
    student_score: number | null;
    coeff: number;
    imputed: boolean; // true nếu lấy mean lớp do thiếu điểm
    same_group: boolean; // cùng nhóm với target?
  }>;
  // Điểm yếu = các môn feature mà SV thấp hơn mean lớp ≥ 0.5đ
  weak_subjects: Array<{ subject_id: string; name: string; score: number; class_avg: number }>;
  // GPA-theo-nhóm của SV vs lớp; nhóm SV YẾU hơn lớp ≥ 0.3đ
  weak_groups: Array<{
    group_id: string;
    label: string;
    student_avg: number;
    class_avg: number;
    diff: number;
  }>;
  // Nhóm SV mạnh nhất (top 2 theo diff dương)
  strong_groups: Array<{
    group_id: string;
    label: string;
    student_avg: number;
    class_avg: number;
    diff: number;
  }>;
  model_r2: number;
  notes: string[]; // cảnh báo, vd: "model có R² thấp", "không có dữ liệu cho môn này"
}

// ============== Singleton loader ==============
let cached: ModelWeightsFile | null = null;

export function loadModelWeights(): ModelWeightsFile {
  if (cached) return cached;
  // Cùng đường dẫn dù chạy từ src/ (dev) hay dist/ (prod)
  // src/services/gradePredictor.service.ts → src/data/model_weights.json
  const candidates = [
    path.resolve(__dirname, "../data/model_weights.json"),
    path.resolve(__dirname, "../../src/data/model_weights.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      cached = JSON.parse(fs.readFileSync(p, "utf-8")) as ModelWeightsFile;
      return cached;
    }
  }
  throw new Error(
    "model_weights.json không tìm thấy. Chạy: npm run train-grades"
  );
}

/** Reset cache (chủ yếu cho test). */
export function resetModelCache(): void {
  cached = null;
}

// ============== Helpers ==============
const MISSING_SENTINEL = 0;

function gpaFromScores(scores: Record<string, number>): number {
  const vals = Object.values(scores).filter(
    (v) => typeof v === "number" && v > MISSING_SENTINEL
  );
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function scoreToGrade(score: number): string {
  if (score >= 9) return "A+";
  if (score >= 8) return "A";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 5) return "D+";
  return "F";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Hàm phân phối chuẩn tích lũy (CDF) — Abramowitz & Stegun 26.2.17 */
function normalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ============== Group-level analysis ==============
const WEAK_GROUP_THRESHOLD = 0.3; // diff (SV - class) ≤ -0.3đ → "yếu" trong nhóm
const STRONG_GROUP_THRESHOLD = 0.3;
const MIN_SUBJECTS_FOR_GROUP_COMPARISON = 2;

interface GroupDiff {
  group_id: string;
  label: string;
  student_avg: number;
  class_avg: number;
  diff: number;
}

/**
 * Tính GPA của SV trong từng nhóm môn (chỉ tính môn SV thực sự có điểm),
 * so với class_avg của nhóm đó. Trả ra weak_groups + strong_groups.
 */
function analyzeGroups(
  scores: Record<string, number>,
  model: ModelWeightsFile
): { weak: GroupDiff[]; strong: GroupDiff[] } {
  const diffs: GroupDiff[] = [];
  for (const [gid, g] of Object.entries(model.groups)) {
    const studentScores = g.subjects
      .map((sid) => scores[sid])
      .filter((v): v is number => typeof v === "number" && v > MISSING_SENTINEL);
    if (studentScores.length < MIN_SUBJECTS_FOR_GROUP_COMPARISON) continue;
    const studentAvg =
      studentScores.reduce((a, b) => a + b, 0) / studentScores.length;
    const diff = +(studentAvg - g.mean).toFixed(2);
    diffs.push({
      group_id: gid,
      label: g.label,
      student_avg: +studentAvg.toFixed(2),
      class_avg: g.mean,
      diff,
    });
  }

  const weak = diffs
    .filter((d) => d.diff <= -WEAK_GROUP_THRESHOLD)
    .sort((a, b) => a.diff - b.diff) // âm nhất trước
    .slice(0, 5); // cap top 5 worst để output gọn

  const strong = diffs
    .filter((d) => d.diff >= STRONG_GROUP_THRESHOLD)
    .sort((a, b) => b.diff - a.diff) // dương nhất trước
    .slice(0, 3);

  return { weak, strong };
}

// ============== Hàm chính ==============
export function predictGrade(input: PredictInput): PredictOutput {
  const model = loadModelWeights();
  const subjectMeta = model.subject_meta[input.subject_id];
  const subjectModel = model.models[input.subject_id];

  const notes: string[] = [];

  if (!subjectMeta) {
    throw new Error(`Không có dữ liệu meta cho môn ${input.subject_id}`);
  }

  const { weak: weakGroups, strong: strongGroups } = analyzeGroups(
    input.scores,
    model
  );

  if (!subjectModel) {
    throw new Error(
      `Môn ${input.subject_id} chưa có đủ feature hợp lệ theo nhóm/học kỳ để tạo model dự báo.`
    );
  }

  // ---- Áp công thức hồi quy ----
  const gpa =
    typeof input.gpa === "number" && input.gpa > 0
      ? input.gpa
      : gpaFromScores(input.scores);
  let predicted = subjectModel.intercept;
  let coeffOffset = 0;
  if (subjectModel.uses_gpa) {
    const gpaCoeff = subjectModel.coeffs[0] ?? 0;
    predicted += gpaCoeff * gpa;
    coeffOffset = 1;
  }

  const featuresUsed: PredictOutput["features_used"] = [];
  const weakSubjects: PredictOutput["weak_subjects"] = [];
  const targetGroups = subjectModel.groups;

  for (let i = 0; i < subjectModel.features.length; i++) {
    const fid = subjectModel.features[i];
    const fCoeff = subjectModel.coeffs[i + coeffOffset] ?? 0;
    const fMeta = model.subject_meta[fid];
    const fGroups = subjectModel.feature_groups[i] ?? [];
    const studentScore = input.scores[fid];
    const valid =
      typeof studentScore === "number" && studentScore > MISSING_SENTINEL;
    const value = valid ? studentScore : fMeta?.mean ?? model.global_stats.overall_mean;

    predicted += fCoeff * value;

    featuresUsed.push({
      subject_id: fid,
      name: subjectModel.feature_names[i],
      student_score: valid ? studentScore : null,
      coeff: fCoeff,
      imputed: !valid,
      same_group: fGroups.some((g) => targetGroups.includes(g)),
    });

    // Đánh dấu môn yếu (chỉ xét môn có điểm thật)
    if (valid && fMeta && studentScore < fMeta.mean - 0.5) {
      weakSubjects.push({
        subject_id: fid,
        name: subjectModel.feature_names[i],
        score: studentScore,
        class_avg: fMeta.mean,
      });
    }
  }

  predicted = clamp(predicted, 0, 10);

  // Percentile vs class
  const z =
    subjectMeta.std > 0 ? (predicted - subjectMeta.mean) / subjectMeta.std : 0;
  const percentile = Math.round(normalCdf(z) * 100);

  const nActualScores = featuresUsed.filter((f) => !f.imputed).length;
  if (nActualScores <= 2) {
    notes.push(
      `Chỉ có ${nActualScores} môn thực sự có điểm trong ${subjectModel.features.length} feature — phần lớn dùng ĐTB lớp thay thế, độ chính xác thấp.`
    );
  }

  if (subjectModel.r2 < 0.3) {
    notes.push(
      `Model cho môn này có R²=${subjectModel.r2.toFixed(2)} (thấp) — độ tin cậy chỉ ở mức tham khảo.`
    );
  }
  // Cảnh báo nếu nhóm SV đang yếu trùng với nhóm môn target
  const targetWeakGroup = weakGroups.find((g) =>
    targetGroups.includes(g.group_id)
  );
  if (targetWeakGroup) {
    notes.push(
      `SV đang yếu ở nhóm "${targetWeakGroup.label}" (${targetWeakGroup.diff}đ so với lớp) — nhóm chứa môn target.`
    );
  }

  return {
    subject_id: input.subject_id,
    subject_name: subjectMeta.name,
    subject_groups: targetGroups,
    predicted_score: +predicted.toFixed(2),
    predicted_grade: scoreToGrade(predicted),
    class_avg: subjectMeta.mean,
    class_std: subjectMeta.std,
    vs_class_avg: +(predicted - subjectMeta.mean).toFixed(2),
    percentile,
    confidence: +Math.max(0, subjectModel.r2).toFixed(2),
    features_used: featuresUsed,
    weak_subjects: weakSubjects,
    weak_groups: weakGroups,
    strong_groups: strongGroups,
    model_r2: subjectModel.r2,
    notes,
  };
}

/** Dự đoán hàng loạt cho danh sách môn. */
export function predictGrades(
  scores: Record<string, number>,
  subjectIds: string[],
  gpa?: number
): PredictOutput[] {
  return subjectIds.map((sid) => predictGrade({ gpa, scores, subject_id: sid }));
}
