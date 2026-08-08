/**
 * TẦNG 0 — OFFLINE TRAINER (chạy 1 lần)
 *
 * Đọc cntt1602_grades.json (37 SV × 52 môn) và sinh ra
 * `src/data/model_weights.json` chứa:
 *   - subject_meta: tên môn, ĐTB lớp, std, số tín chỉ
 *   - models: hệ số hồi quy tuyến tính (ridge) cho từng môn,
 *     chỉ dùng các môn hợp lệ theo subject_groups + semester/prerequisite từ backend catalog
 *
 * Cách chạy:
 *   yarn ts-node -r tsconfig-paths/register scripts/train-grade-predictor.ts
 *   (hoặc: npm run train-grades)
 */

import fs from "node:fs";
import path from "node:path";
import {
  getSubjectCatalog,
  type CatalogSubject,
} from "~/services/subjectCatalog.service";

// =================== Cấu hình huấn luyện ===================
const TOP_K_FEATURES = 5; // mỗi môn dùng tối đa K môn correlated nhất làm feature
const RIDGE_LAMBDA = 0.5; // hệ số chuẩn hoá L2 để tránh ma trận suy biến
const MIN_SAMPLES = 10; // mặc định cho nhóm thường
const RELAXED_MIN_SAMPLES = 5; // cho chuỗi ordered / choose_one_path ngắn
const MISSING_SENTINEL = 0; // điểm 0.0 trong dataset coi như chưa học

// Ưu tiên feature trong cùng nhóm môn (subject_groups.json):
// - Khi rank top-K, các môn cùng nhóm với target được cộng thêm GROUP_BONUS vào |r|.
// - Đảm bảo ít nhất MIN_SAME_GROUP feature thuộc cùng nhóm (nếu có đủ candidate).
const GROUP_BONUS = 0.1;
const MIN_SAME_GROUP = 2;
const MIN_ALLOWED_FEATURES = 1;

// =================== Kiểu dữ liệu input ===================
interface SubjectMetaRaw {
  id: string;
  name: string;
  credits: number;
  code?: string;
}

interface SubjectCatalogEntry {
  id: string;
  name: string;
  credits: number;
  semester?: number;
  prerequisites?: string[];
  prerequisite_ids?: string[];
  code?: string;
  category?: string;
  sub_category?: string;
}

interface StudentRaw {
  student_id: string;
  name: string;
  scores: Record<string, number>;
}

interface GradesFile {
  metadata: {
    class: string;
    total_students: number;
    total_subjects: number;
    subject_clusters: Record<
      string,
      { label: string; subjects: SubjectMetaRaw[] }
    >;
  };
  subjects?: SubjectCatalogEntry[];
  students: StudentRaw[];
}

interface SubjectGroupsFile {
  version: string;
  groups: Record<
    string,
    {
      label: string;
      subjects: string[];
      rule?: string;
      paths?: Array<{ name: string; required: string[] }>;
      ordered?: boolean;
      note?: string;
      missing_in_dataset?: string[];
    }
  >;
}

// =================== Tiện ích thống kê ===================
function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : num / den;
}

// =================== Đại số tuyến tính: Ridge Regression ===================
type Matrix = number[][];

function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const m = b[0].length;
  const k = b.length;
  const out: Matrix = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += a[i][p] * b[p][j];
      out[i][j] = s;
    }
  }
  return out;
}

function transpose(a: Matrix): Matrix {
  const n = a.length;
  const m = a[0].length;
  const out: Matrix = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) out[j][i] = a[i][j];
  return out;
}

/** Gauss-Jordan elimination để tính nghịch đảo (ma trận nhỏ, k ≤ 10) */
function invert(a: Matrix): Matrix {
  const n = a.length;
  const aug: Matrix = a.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
    }
    if (Math.abs(aug[pivot][col]) < 1e-12) {
      throw new Error(`Matrix singular at column ${col}`);
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const div = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

/**
 * Ridge regression khép kín: β = (XᵀX + λI)⁻¹ Xᵀy
 * X đã được prepend cột 1 (bias). λ không áp lên cột bias (i=0).
 */
function ridgeFit(
  X: Matrix,
  y: number[],
  lambda: number
): { coeffs: number[]; intercept: number; r2: number } {
  const n = X.length;
  const Xb: Matrix = X.map((row) => [1, ...row]);
  const k = Xb[0].length;
  const Xt = transpose(Xb);
  const XtX = matMul(Xt, Xb);
  for (let i = 1; i < k; i++) XtX[i][i] += lambda;
  const inv = invert(XtX);
  const Xty = matMul(
    Xt,
    y.map((v) => [v])
  );
  const beta = matMul(inv, Xty).map((row) => row[0]);
  const intercept = beta[0];
  const coeffs = beta.slice(1);

  const yPred = Xb.map((row) => row.reduce((s, v, i) => s + v * beta[i], 0));
  const yMean = mean(y);
  const ssTot = y.reduce((s, v) => s + (v - yMean) * (v - yMean), 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]) * (v - yPred[i]), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { coeffs, intercept, r2 };
}

// =================== Pipeline chính ===================
function buildSubjectMeta(
  raw: GradesFile
): Record<string, { name: string; credits: number; cluster: string }> {
  const meta: Record<string, { name: string; credits: number; cluster: string }> = {};
  for (const [clusterKey, cluster] of Object.entries(
    raw.metadata.subject_clusters
  )) {
    for (const s of cluster.subjects) {
      meta[s.id] = { name: s.name, credits: s.credits, cluster: clusterKey };
    }
  }
  return meta;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildDatasetSubjectKeyIndex(
  raw: GradesFile,
  baseMeta: Record<string, { name: string; credits: number; cluster: string }>
): Map<string, string> {
  const byKey = new Map<string, string>();

  for (const [id, meta] of Object.entries(baseMeta)) {
    byKey.set(normalizeName(meta.name), id);
  }

  for (const item of raw.subjects ?? []) {
    byKey.set(normalizeName(item.name), item.id);
    if (item.code) byKey.set(normalizeName(item.code), item.id);
  }

  return byKey;
}

function resolveDatasetSubjectId(
  subject: CatalogSubject,
  datasetByKey: Map<string, string>,
  subjectCatalog: Record<string, SubjectCatalogEntry>
): string | null {
  const directId = subject.model_subject_id?.trim();
  if (directId && subjectCatalog[directId]) return directId;

  const exactKeys = [subject.name, subject.code]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map(normalizeName);

  for (const key of exactKeys) {
    const matched = datasetByKey.get(key);
    if (matched) return matched;
  }

  const normalizedName = normalizeName(subject.name);
  const normalizedCode = subject.code ? normalizeName(subject.code) : "";
  for (const [sid, detail] of Object.entries(subjectCatalog)) {
    const detailName = normalizeName(detail.name);
    const detailCode = detail.code ? normalizeName(detail.code) : "";
    if (
      detailName === normalizedName ||
      (normalizedCode && detailCode === normalizedCode) ||
      detailName.includes(normalizedName) ||
      normalizedName.includes(detailName) ||
      (normalizedCode &&
        detailCode &&
        (detailCode.includes(normalizedCode) || normalizedCode.includes(detailCode)))
    ) {
      return sid;
    }
  }

  return null;
}

async function buildSubjectCatalogMap(
  raw: GradesFile,
  baseMeta: Record<string, { name: string; credits: number; cluster: string }>
): Promise<Record<string, SubjectCatalogEntry>> {
  const out: Record<string, SubjectCatalogEntry> = {};
  for (const [id, meta] of Object.entries(baseMeta)) {
    out[id] = {
      id,
      name: meta.name,
      credits: meta.credits,
    };
  }

  const datasetByKey = buildDatasetSubjectKeyIndex(raw, baseMeta);

  const programId = process.env.TRAIN_PROGRAM_ID?.trim() || undefined;
  const catalog = await getSubjectCatalog(programId, { hideEmptyGroups: false });
  const backendSubjects = catalog.groups.flatMap((g) => g.subjects);
  let matchedCount = 0;
  const unmatched: string[] = [];

  for (const subject of backendSubjects) {
    const resolvedId = resolveDatasetSubjectId(subject, datasetByKey, out);
    if (!resolvedId) {
      unmatched.push(subject.name);
      continue;
    }

    const current = out[resolvedId];
    if (!current) continue;

    out[resolvedId] = {
      ...current,
      ...mapCatalogSubject(subject, resolvedId),
    };
    matchedCount++;
  }

  console.log(
    `[T0] Đồng bộ metadata backend cho ${matchedCount}/${Object.keys(out).length} môn trong dataset`
  );
  if (unmatched.length > 0) {
    console.warn(
      `[T0] ${unmatched.length} môn trong backend catalog không map được sang dataset Sxx: ${unmatched
        .slice(0, 10)
        .join(", ")}${unmatched.length > 10 ? ", ..." : ""}`
    );
  }

  return out;
}

function mapCatalogSubject(
  subject: CatalogSubject,
  modelSubjectId: string
): SubjectCatalogEntry {
  return {
    id: modelSubjectId,
    name: subject.name,
    credits: subject.credits,
    semester: subject.semester,
    code: subject.code,
    category: subject.category,
    sub_category: subject.sub_category ?? undefined,
    prerequisites: subject.prerequisite_names,
    prerequisite_ids: subject.prerequisite_ids,
  };
}

function buildSubjectLookupKeys(detail: SubjectCatalogEntry): string[] {
  const keys = new Set<string>();
  keys.add(normalizeName(detail.name));
  if (detail.code) keys.add(normalizeName(detail.code));
  return [...keys].filter(Boolean);
}

function resolvePrerequisiteIds(
  subject: SubjectCatalogEntry | undefined,
  subjectCatalog: Record<string, SubjectCatalogEntry>
): string[] {
  if (subject?.prerequisite_ids?.length) {
    return subject.prerequisite_ids.filter((sid) => Boolean(subjectCatalog[sid]));
  }
  if (!subject?.prerequisites?.length) return [];
  const byKey = new Map<string, string>();
  for (const [sid, detail] of Object.entries(subjectCatalog)) {
    for (const key of buildSubjectLookupKeys(detail)) {
      byKey.set(key, sid);
    }
  }

  const resolved = new Set<string>();
  for (const prereq of subject.prerequisites) {
    const normalized = normalizeName(prereq);
    const direct = byKey.get(normalized);
    if (direct) {
      resolved.add(direct);
      continue;
    }
    for (const [sid, detail] of Object.entries(subjectCatalog)) {
      const nameKey = normalizeName(detail.name);
      const codeKey = detail.code ? normalizeName(detail.code) : "";
      if (
        nameKey.includes(normalized) ||
        normalized.includes(nameKey) ||
        (codeKey && (codeKey.includes(normalized) || normalized.includes(codeKey)))
      ) {
        resolved.add(sid);
        break;
      }
    }
  }
  return [...resolved];
}

function getOrderedPredecessorIds(
  targetId: string,
  targetGroups: string[],
  groupsFile: SubjectGroupsFile
): string[] {
  const predecessors = new Set<string>();
  for (const gid of targetGroups) {
    const group = groupsFile.groups[gid];
    if (!group?.ordered) continue;
    const idx = group.subjects.indexOf(targetId);
    if (idx <= 0) continue;
    for (let i = 0; i < idx; i++) predecessors.add(group.subjects[i]);
  }
  return [...predecessors];
}

function getChooseOnePathPredecessorIds(
  targetId: string,
  targetGroups: string[],
  groupsFile: SubjectGroupsFile
): string[] {
  const predecessors = new Set<string>();
  for (const gid of targetGroups) {
    const group = groupsFile.groups[gid];
    if (group?.rule !== "choose_one_path" || !group.paths?.length) continue;
    for (const path of group.paths) {
      const idx = path.required.indexOf(targetId);
      if (idx <= 0) continue;
      for (let i = 0; i < idx; i++) predecessors.add(path.required[i]);
    }
  }
  return [...predecessors];
}

function isRelaxedFeatureTarget(
  targetGroups: string[],
  groupsFile: SubjectGroupsFile
): boolean {
  return targetGroups.some((gid) => {
    const group = groupsFile.groups[gid];
    return Boolean(group?.ordered || group?.rule === "choose_one_path");
  });
}

function getMinSamplesForTarget(
  targetGroups: string[],
  groupsFile: SubjectGroupsFile
): number {
  return isRelaxedFeatureTarget(targetGroups, groupsFile)
    ? RELAXED_MIN_SAMPLES
    : MIN_SAMPLES;
}

function getAllowedFeatureIds(
  targetId: string,
  subjectCatalog: Record<string, SubjectCatalogEntry>,
  subjectToGroups: Record<string, string[]>,
  groupsFile: SubjectGroupsFile
): string[] {
  const target = subjectCatalog[targetId];
  const targetGroups = subjectToGroups[targetId] ?? [];
  const targetSemester = target?.semester ?? 0;
  const allowed = new Set<string>();

  for (const gid of targetGroups) {
    const group = groupsFile.groups[gid];
    if (!group) continue;
    if (group.rule === "choose_one_path" && group.paths?.length) {
      for (const path of group.paths) {
        const targetPathIndex = path.required.indexOf(targetId);
        if (targetPathIndex <= 0) continue;
        for (let i = 0; i < targetPathIndex; i++) {
          const sid = path.required[i];
          const detail = subjectCatalog[sid];
          if (!detail || sid === targetId) continue;
          allowed.add(sid);
        }
      }
      continue;
    }
    const targetIndex = group.subjects.indexOf(targetId);
    for (const sid of group.subjects) {
      if (sid === targetId) continue;
      const detail = subjectCatalog[sid];
      if (!detail) continue;
      const candidateSemester = detail.semester ?? 0;
      const earlierInGroup =
        targetIndex >= 0 && group.subjects.indexOf(sid) >= 0
          ? group.subjects.indexOf(sid) < targetIndex
          : false;
      const sameSemesterByManualOrder = Boolean(group.ordered && earlierInGroup);

      if (targetSemester > 0 && candidateSemester > 0) {
        if (candidateSemester < targetSemester) {
          allowed.add(sid);
          continue;
        }
        if (candidateSemester === targetSemester && sameSemesterByManualOrder) {
          allowed.add(sid);
          continue;
        }
        continue;
      }

      if (sameSemesterByManualOrder) allowed.add(sid);
    }
  }
  return [...allowed];
}

function gpaOf(scores: Record<string, number>): number {
  const valid = Object.values(scores).filter((v) => v > MISSING_SENTINEL);
  return valid.length === 0 ? 0 : mean(valid);
}

interface SubjectModel {
  name: string;
  features: string[]; // mã môn dùng làm feature
  feature_names: string[]; // tên người-đọc-được
  feature_groups: string[][]; // [["software"], ["ai_iot","software"], ...] - nhóm của mỗi feature
  uses_gpa: boolean;
  coeffs: number[]; // hệ số cho [feature_1, feature_2, ...]
  intercept: number;
  r2: number;
  n_train: number;
  groups: string[]; // các nhóm mà MÔN TARGET thuộc về
  top_correlations: Array<{
    subject_id: string;
    name: string;
    r: number;
    same_group: boolean;
  }>;
}

interface GroupStats {
  label: string;
  subjects: string[]; // các môn THỰC TẾ có mặt trong dataset
  mean: number; // ĐTB của nhóm trên toàn lớp
  std: number;
  n_subjects: number;
  rule?: string; // "choose_one_path" cho thể chất
}

interface ModelWeightsFile {
  version: string;
  trained_at: string;
  class: string;
  n_students: number;
  config: {
    top_k_features: number;
    ridge_lambda: number;
    min_samples: number;
    relaxed_min_samples: number;
    group_bonus: number;
    min_same_group: number;
    min_allowed_features: number;
  };
  global_stats: {
    overall_mean: number;
    overall_std: number;
  };
  subject_meta: Record<
    string,
    {
      name: string;
      credits: number;
      cluster: string;
      groups: string[]; // các nhóm môn này thuộc về
      mean: number;
      std: number;
      n: number;
    }
  >;
  groups: Record<string, GroupStats>;
  models: Record<string, SubjectModel>;
}

async function train(
  gradesPath: string,
  groupsPath: string,
  outPath: string
): Promise<void> {
  console.log(`[T0] Đang đọc dataset: ${gradesPath}`);
  const raw: GradesFile = JSON.parse(fs.readFileSync(gradesPath, "utf-8"));
  const subjectMeta = buildSubjectMeta(raw);
  const subjectCatalog = await buildSubjectCatalogMap(raw, subjectMeta);
  const allSubjectIds = Object.keys(subjectMeta);
  console.log(
    `[T0] Lớp ${raw.metadata.class}: ${raw.students.length} SV, ${allSubjectIds.length} môn`
  );
  console.log("[T0] Ưu tiên metadata môn học từ subject catalog backend (semester, prerequisites)");

  // ---- 0) Đọc subject_groups.json + build reverse index subject → groups[] ----
  const groupsFile: SubjectGroupsFile = JSON.parse(
    fs.readFileSync(groupsPath, "utf-8")
  );
  const subjectToGroups: Record<string, string[]> = {};
  for (const [gid, g] of Object.entries(groupsFile.groups)) {
    for (const sid of g.subjects) {
      if (!subjectToGroups[sid]) subjectToGroups[sid] = [];
      subjectToGroups[sid].push(gid);
    }
  }
  console.log(`[T0] Nạp ${Object.keys(groupsFile.groups).length} nhóm môn`);

  // ---- 1) Subject-level statistics (mean, std, n) ----
  const subjectStats: ModelWeightsFile["subject_meta"] = {};
  for (const sid of allSubjectIds) {
    const vals = raw.students
      .map((s) => s.scores[sid])
      .filter((v): v is number => typeof v === "number" && v > MISSING_SENTINEL);
    subjectStats[sid] = {
      ...subjectMeta[sid],
      groups: subjectToGroups[sid] ?? [],
      mean: vals.length ? +mean(vals).toFixed(3) : 0,
      std: vals.length ? +std(vals).toFixed(3) : 0,
      n: vals.length,
    };
  }

  // ---- 1b) Group-level statistics ----
  const groupStats: Record<string, GroupStats> = {};
  for (const [gid, g] of Object.entries(groupsFile.groups)) {
    const presentSubjects = g.subjects.filter((sid) => allSubjectIds.includes(sid));
    // GPA-trong-nhóm cho mỗi SV (lấy mean các môn của nhóm mà SV thực sự có điểm)
    const perStudentMeans: number[] = [];
    for (const stu of raw.students) {
      const vals = presentSubjects
        .map((sid) => stu.scores[sid])
        .filter((v): v is number => typeof v === "number" && v > MISSING_SENTINEL);
      if (vals.length > 0) perStudentMeans.push(mean(vals));
    }
    groupStats[gid] = {
      label: g.label,
      subjects: presentSubjects,
      mean: perStudentMeans.length ? +mean(perStudentMeans).toFixed(3) : 0,
      std: perStudentMeans.length ? +std(perStudentMeans).toFixed(3) : 0,
      n_subjects: presentSubjects.length,
      rule: g.rule,
    };
  }

  // ---- 2) Thống kê chung toàn lớp (giữ để tham chiếu/debug) ----
  const gpas = raw.students.map((s) => gpaOf(s.scores));
  const overallMean = mean(gpas);
  const overallStd = std(gpas);
  console.log(
    `[T0] GPA toàn lớp: mean=${overallMean.toFixed(2)} std=${overallStd.toFixed(2)}`
  );

  // ---- 3) Train 1 model riêng cho mỗi môn target ----
  const models: Record<string, SubjectModel> = {};
  let trained = 0;
  let skipped = 0;

  for (const target of allSubjectIds) {
    const targetGroups = subjectToGroups[target] ?? [];
    const minSamplesForTarget = getMinSamplesForTarget(targetGroups, groupsFile);

    // gom các SV có điểm môn target hợp lệ
    const rows: Array<{ y: number; scores: Record<string, number> }> = [];
    for (let i = 0; i < raw.students.length; i++) {
      const score = raw.students[i].scores[target];
      if (typeof score !== "number" || score <= MISSING_SENTINEL) continue;
      const otherScores = { ...raw.students[i].scores };
      delete otherScores[target];
      rows.push({ y: score, scores: otherScores });
    }
    if (rows.length < minSamplesForTarget) {
      skipped++;
      continue;
    }

    // ---- 3a) Chỉ xét feature hợp lệ theo group thủ công + học kỳ/tiên quyết ----
    const targetDetail = subjectCatalog[target];
    const allowedFeatureIds = getAllowedFeatureIds(
      target,
      subjectCatalog,
      subjectToGroups,
      groupsFile
    );
    if (allowedFeatureIds.length < MIN_ALLOWED_FEATURES) {
      skipped++;
      continue;
    }

    const prerequisiteIds = new Set(
      resolvePrerequisiteIds(targetDetail, subjectCatalog)
    );
    const orderedPredecessorIds = new Set(
      getOrderedPredecessorIds(target, targetGroups, groupsFile)
    );
    const pathPredecessorIds = new Set(
      getChooseOnePathPredecessorIds(target, targetGroups, groupsFile)
    );
    const targetSemester = targetDetail?.semester ?? 0;

    const corrs: Array<{
      subject_id: string;
      r: number;
      coverage: number;
      is_prerequisite: boolean;
      is_ordered_predecessor: boolean;
      is_path_predecessor: boolean;
      semester_gap: number;
    }> = [];
    for (const candidate of allowedFeatureIds) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of rows) {
        const v = r.scores[candidate];
        if (typeof v === "number" && v > MISSING_SENTINEL) {
          xs.push(v);
          ys.push(r.y);
        }
      }
      if (xs.length < minSamplesForTarget) continue;
      const candidateSemester = subjectCatalog[candidate]?.semester ?? 0;
      corrs.push({
        subject_id: candidate,
        r: pearson(xs, ys),
        coverage: xs.length,
        is_prerequisite: prerequisiteIds.has(candidate),
        is_ordered_predecessor: orderedPredecessorIds.has(candidate),
        is_path_predecessor: pathPredecessorIds.has(candidate),
        semester_gap:
          targetSemester > 0 && candidateSemester > 0
            ? targetSemester - candidateSemester
            : 0,
      });
    }

    const isSameGroup = (sid: string): boolean => {
      const sgs = subjectToGroups[sid] ?? [];
      return sgs.some((g) => targetGroups.includes(g));
    };
    const scored = corrs.map((c) => ({
      ...c,
      score:
        Math.abs(c.r) +
        (isSameGroup(c.subject_id) ? GROUP_BONUS : 0) +
        (c.is_prerequisite ? 2 : 0) +
        (c.is_ordered_predecessor ? 1.5 : 0) +
        (c.is_path_predecessor ? 1.5 : 0) +
        (c.semester_gap > 0 ? 0.5 : 0),
    }));
    scored.sort((a, b) => {
      const d = b.score - a.score;
      return d !== 0 ? d : b.coverage - a.coverage;
    });

    let topFeatures = scored.slice(0, TOP_K_FEATURES);
    if (topFeatures.length < MIN_ALLOWED_FEATURES) {
      skipped++;
      continue;
    }

    // ---- 3b) Build matrix X (scores của top features) ----
    // Nếu thiếu điểm một feature thì thay bằng mean lớp của feature đó
    const Xdata: Matrix = [];
    const ydata: number[] = [];
    for (const r of rows) {
      const feats: number[] = [];
      for (const f of topFeatures) {
        const v = r.scores[f.subject_id];
        if (typeof v === "number" && v > MISSING_SENTINEL) {
          feats.push(v);
        } else {
          feats.push(subjectStats[f.subject_id].mean);
        }
      }
      Xdata.push(feats);
      ydata.push(r.y);
    }

    let fit;
    try {
      fit = ridgeFit(Xdata, ydata, RIDGE_LAMBDA);
    } catch (e) {
      console.warn(
        `[T0] Bỏ qua ${target} (${subjectMeta[target].name}): ${(e as Error).message}`
      );
      skipped++;
      continue;
    }

    models[target] = {
      name: subjectMeta[target].name,
      features: topFeatures.map((f) => f.subject_id),
      feature_names: topFeatures.map((f) => subjectMeta[f.subject_id].name),
      feature_groups: topFeatures.map((f) => subjectToGroups[f.subject_id] ?? []),
      uses_gpa: false,
      coeffs: fit.coeffs.map((c) => +c.toFixed(4)),
      intercept: +fit.intercept.toFixed(4),
      r2: +fit.r2.toFixed(3),
      n_train: rows.length,
      groups: targetGroups,
      top_correlations: topFeatures.map((f) => ({
        subject_id: f.subject_id,
        name: subjectMeta[f.subject_id].name,
        r: +f.r.toFixed(3),
        same_group: isSameGroup(f.subject_id),
      })),
    };
    trained++;
  }

  console.log(
    `[T0] Train xong: ${trained} model | bỏ qua ${skipped} môn (thiếu dữ liệu)`
  );

  // ---- 4) Ghi file output ----
  const out: ModelWeightsFile = {
    version: "3.0",
    trained_at: new Date().toISOString(),
    class: raw.metadata.class,
    n_students: raw.students.length,
    config: {
      top_k_features: TOP_K_FEATURES,
      ridge_lambda: RIDGE_LAMBDA,
      min_samples: MIN_SAMPLES,
      relaxed_min_samples: RELAXED_MIN_SAMPLES,
      group_bonus: GROUP_BONUS,
      min_same_group: MIN_SAME_GROUP,
      min_allowed_features: MIN_ALLOWED_FEATURES,
    },
    global_stats: {
      overall_mean: +overallMean.toFixed(3),
      overall_std: +overallStd.toFixed(3),
    },
    subject_meta: subjectStats,
    groups: groupStats,
    models,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[T0] Đã ghi ${outPath} (${sizeKb} KB)`);

  // ---- 5) Tóm tắt R² ----
  const r2s = Object.values(models).map((m) => m.r2);
  if (r2s.length) {
    const sorted = [...r2s].sort((a, b) => b - a);
    console.log(
      `[T0] R²: tốt nhất=${sorted[0].toFixed(2)} | trung vị=${sorted[
        Math.floor(sorted.length / 2)
      ].toFixed(2)} | tệ nhất=${sorted[sorted.length - 1].toFixed(2)}`
    );
  }

  // ---- 6) Báo cáo feature selection theo group thủ công ----
  const sameGroupCounts = Object.values(models).map(
    (m) => m.top_correlations.filter((c) => c.same_group).length
  );
  const avgSameGroup =
    sameGroupCounts.length === 0
      ? 0
      : sameGroupCounts.reduce((a, b) => a + b, 0) / sameGroupCounts.length;
  console.log(
    `[T0] Manual-group aware: TB ${avgSameGroup.toFixed(2)}/${TOP_K_FEATURES} feature cùng nhóm với target`
  );
}

// =================== Entry ===================
const gradesPath = path.resolve(__dirname, "../../../cntt1602_grades.json");
const groupsPath = path.resolve(__dirname, "../src/data/subject_groups.json");
const outPath = path.resolve(__dirname, "../src/data/model_weights.json");
void train(gradesPath, groupsPath, outPath).catch((error) => {
  console.error("[T0] Train thất bại:", error);
  process.exit(1);
});
