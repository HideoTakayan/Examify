import fs from "node:fs";
import path from "node:path";

export interface SubjectGroupsFile {
  version: string;
  groups: Record<
    string,
    {
      label: string;
      subjects: string[];
      ordered?: boolean;
      rule?: string;
      paths?: Array<{ name: string; required: string[] }>;
    }
  >;
}

export interface SubjectNameEntry {
  id: string;
  name: string;
}

let groupsCache: SubjectGroupsFile | null = null;
let nameToIdCache: Map<string, string> | null = null;
let modelIdsCache: Set<string> | null = null;

type ModelWeightsIndex = {
  subject_meta: Record<string, { name: string }>;
  models?: Record<string, unknown>;
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadGroupsFile(): SubjectGroupsFile {
  if (groupsCache) return groupsCache;
  const candidates = [
    path.resolve(__dirname, "../data/subject_groups.json"),
    path.resolve(__dirname, "../../src/data/subject_groups.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      groupsCache = JSON.parse(fs.readFileSync(p, "utf-8")) as SubjectGroupsFile;
      return groupsCache;
    }
  }
  throw new Error("subject_groups.json không tìm thấy");
}

function loadModelWeightsIndex(): ModelWeightsIndex {
  const candidates = [
    path.resolve(__dirname, "../data/model_weights.json"),
    path.resolve(__dirname, "../../src/data/model_weights.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as ModelWeightsIndex;
    }
  }
  return { subject_meta: {}, models: {} };
}

/** Nạp map tên môn → Sxx từ model_weights.json */
export function loadSubjectNameIndex(): Map<string, string> {
  if (nameToIdCache) return nameToIdCache;
  const raw = loadModelWeightsIndex();
  const map = new Map<string, string>();
  if (raw?.subject_meta) {
    for (const [id, meta] of Object.entries(raw.subject_meta)) {
      map.set(normalizeName(meta.name), id);
      map.set(normalizeName(id), id);
    }
  }
  nameToIdCache = map;
  return map;
}

export function hasPredictionModel(subjectId: string): boolean {
  if (!subjectId?.trim()) return false;
  if (!modelIdsCache) {
    const raw = loadModelWeightsIndex();
    modelIdsCache = new Set(Object.keys(raw.models ?? {}));
  }
  return modelIdsCache.has(subjectId);
}

export function resolveSubjectId(subjectLabel: string): string | null {
  const map = loadSubjectNameIndex();
  const n = normalizeName(subjectLabel);
  if (map.has(n)) return map.get(n)!;
  for (const [key, id] of map.entries()) {
    if (n.includes(key) || key.includes(n)) return id;
  }
  return null;
}

export function getSubjectName(subjectId: string): string | null {
  const candidates = [
    path.resolve(__dirname, "../data/model_weights.json"),
    path.resolve(__dirname, "../../src/data/model_weights.json"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as {
      subject_meta: Record<string, { name: string }>;
    };
    return raw.subject_meta[subjectId]?.name ?? null;
  }
  return null;
}

/** Các nhóm chứa môn vừa thi */
export function getGroupsForSubject(subjectLabel: string): string[] {
  const sid = resolveSubjectId(subjectLabel);
  if (!sid) return [];
  const groups = loadGroupsFile();
  const out: string[] = [];
  for (const [gid, g] of Object.entries(groups.groups)) {
    if (g.subjects.includes(sid)) out.push(gid);
  }
  return out;
}

function historyHasSubject(
  completedNames: Set<string>,
  subjectId: string
): boolean {
  const name = getSubjectName(subjectId);
  if (!name) return false;
  const n = normalizeName(name);
  for (const h of completedNames) {
    if (normalizeName(h) === n) return true;
    if (normalizeName(h).includes(n) || n.includes(normalizeName(h))) return true;
  }
  return false;
}

/** Môn tiếp theo trong nhóm có thứ tự (Tiếng Anh, Quốc phòng, Kỹ năng mềm). */
function nextOrderedInGroup(
  groupId: string,
  justCompletedId: string
): string[] {
  const g = loadGroupsFile().groups[groupId];
  if (!g?.ordered || !g.subjects.length) return [];
  const idx = g.subjects.indexOf(justCompletedId);
  if (idx < 0 || idx >= g.subjects.length - 1) return [];
  return [g.subjects[idx + 1]];
}

const MAX_TARGETS = 6;

/**
 * Chọn môn được phép dự đoán sau khi SV vừa hoàn thành một môn.
 * Quy tắc: chỉ môn thuộc CÙNG NHÓM (subject_groups.json), chưa có trong lịch sử.
 * Nhóm ordered: chỉ môn KẾ TIẾP trong chuỗi (P1→P2), không nhảy xa.
 */
export function getPredictionTargets(
  justCompletedSubject: string,
  completedSubjectNames: string[] = []
): { targets: string[]; groupLabels: string[]; completedId: string | null } {
  const completedSet = new Set(completedSubjectNames);
  completedSet.add(justCompletedSubject);

  const completedId = resolveSubjectId(justCompletedSubject);
  const groupIds = getGroupsForSubject(justCompletedSubject);

  if (!completedId || groupIds.length === 0) {
    return { targets: [], groupLabels: [], completedId };
  }

  const groups = loadGroupsFile();
  const targetIds = new Set<string>();
  const labels: string[] = [];

  for (const gid of groupIds) {
    const g = groups.groups[gid];
    if (!g) continue;
    labels.push(g.label);

    if (g.ordered) {
      for (const nid of nextOrderedInGroup(gid, completedId)) {
        if (!historyHasSubject(completedSet, nid) && hasPredictionModel(nid)) {
          targetIds.add(nid);
        }
      }
      continue;
    }

    for (const sid of g.subjects) {
      if (sid === completedId) continue;
      if (historyHasSubject(completedSet, sid)) continue;
      if (!hasPredictionModel(sid)) continue;
      targetIds.add(sid);
    }
  }

  const targets = [...targetIds]
    .map((id) => getSubjectName(id))
    .filter((n): n is string => Boolean(n))
    .slice(0, MAX_TARGETS);

  return {
    targets,
    groupLabels: [...new Set(labels)],
    completedId,
  };
}

/** Thứ tự hiển thị khối trên UI dự đoán / picker (theo phân nhóm DEMO-CLASS) */
export const PREDICTION_GROUP_ORDER = [
  "pe",
  "defense",
  "english",
  "ai_iot",
  "philosophy",
  "software",
  "bigdata",
  "network",
  "internship",
  "security",
  "soft_skills",
  "math",
] as const;

export type PredictionEligibility = {
  eligible: boolean;
  target_subject: string;
  target_id: string | null;
  group_labels: string[];
  missing_prerequisites: string[];
  scored_in_group: string[];
  message: string;
};

/** Môn tiên quyết trong nhóm (ordered): tất cả môn đứng trước môn đích. */
export function getPrerequisiteIdsForTarget(targetId: string): string[] {
  const groups = loadGroupsFile();
  const required = new Set<string>();
  for (const g of Object.values(groups.groups)) {
    if (!g.ordered) continue;
    const idx = g.subjects.indexOf(targetId);
    if (idx <= 0) continue;
    for (let i = 0; i < idx; i++) required.add(g.subjects[i]);
  }
  return [...required];
}

export function assessTargetEligibility(
  targetSubjectName: string,
  completedSubjectNames: string[]
): PredictionEligibility {
  const targetId = resolveSubjectId(targetSubjectName);
  const completedSet = new Set(completedSubjectNames);
  const groupIds = targetId ? getGroupsForSubject(targetSubjectName) : [];
  const groups = loadGroupsFile();
  const groupLabels = groupIds
    .map((gid) => groups.groups[gid]?.label)
    .filter((l): l is string => Boolean(l));

  if (!targetId) {
    return {
      eligible: false,
      target_subject: targetSubjectName,
      target_id: null,
      group_labels: groupLabels,
      missing_prerequisites: [],
      scored_in_group: [],
      message: "Không nhận diện được môn trong mô hình dự đoán.",
    };
  }

  if (groupIds.length === 0) {
    return {
      eligible: false,
      target_subject: targetSubjectName,
      target_id: targetId,
      group_labels: [],
      missing_prerequisites: [],
      scored_in_group: [],
      message: "Môn này chưa được gán nhóm dự đoán (subject_groups).",
    };
  }

  const prereqIds = getPrerequisiteIdsForTarget(targetId);
  const missing: string[] = [];
  for (const pid of prereqIds) {
    if (!historyHasSubject(completedSet, pid)) {
      const name = getSubjectName(pid);
      if (name) missing.push(name);
    }
  }

  const scoredInGroup: string[] = [];
  for (const gid of groupIds) {
    const g = groups.groups[gid];
    if (!g) continue;
    for (const sid of g.subjects) {
      if (sid === targetId) continue;
      if (historyHasSubject(completedSet, sid)) {
        const name = getSubjectName(sid);
        if (name && !scoredInGroup.includes(name)) scoredInGroup.push(name);
      }
    }
  }

  const predictionAvailable = hasPredictionModel(targetId);
  if (!predictionAvailable) {
    return {
      eligible: false,
      target_subject: targetSubjectName,
      target_id: targetId,
      group_labels: groupLabels,
      missing_prerequisites: [],
      scored_in_group: scoredInGroup,
      message:
        "Môn này hiện chưa có đủ feature hợp lệ theo nhóm/học kỳ để tạo model dự báo điểm.",
    };
  }

  const hasContextInGroup = scoredInGroup.length > 0;
  const hasAnyCompleted = completedSubjectNames.length > 0;
  const eligible = missing.length === 0 && hasAnyCompleted;

  let message = "";
  if (missing.length > 0) {
    message = `Chưa đủ dữ kiện: cần điểm các môn tiên quyết trong nhóm (${groupLabels.join(", ")}): ${missing.join(", ")}.`;
  } else if (!hasAnyCompleted) {
    message = "Chưa có bài thi hoàn thành nào.";
  } else if (!hasContextInGroup) {
    message = `Đủ dữ liệu để dự báo (chưa có môn cùng nhóm ${groupLabels.join(", ")} — kết quả mang tính tham khảo).`;
  } else {
    message = "Đủ dữ kiện để dự đoán.";
  }

  return {
    eligible,
    target_subject: targetSubjectName,
    target_id: targetId,
    group_labels: groupLabels,
    missing_prerequisites: missing,
    scored_in_group: scoredInGroup,
    message,
  };
}

export function listPredictionGroupCatalog(): Array<{
  id: string;
  label: string;
  subject_ids: string[];
  subject_names: string[];
}> {
  const file = loadGroupsFile();
  const ordered = [...PREDICTION_GROUP_ORDER];
  const out: Array<{
    id: string;
    label: string;
    subject_ids: string[];
    subject_names: string[];
  }> = [];

  for (const gid of ordered) {
    const g = file.groups[gid];
    if (!g) continue;
    out.push({
      id: gid,
      label: g.label,
      subject_ids: g.subjects,
      subject_names: g.subjects
        .map((sid) => getSubjectName(sid))
        .filter((n): n is string => Boolean(n)),
    });
  }

  for (const [gid, g] of Object.entries(file.groups)) {
    if (ordered.includes(gid as (typeof ordered)[number])) continue;
    out.push({
      id: gid,
      label: g.label,
      subject_ids: g.subjects,
      subject_names: g.subjects
        .map((sid) => getSubjectName(sid))
        .filter((n): n is string => Boolean(n)),
    });
  }

  return out;
}

export function subjectInSameGroupAsTarget(
  subjectLabel: string,
  targetId: string
): boolean {
  const sid = resolveSubjectId(subjectLabel);
  if (!sid) return false;
  const targetGroups = new Set<string>();
  const groups = loadGroupsFile();
  for (const [gid, g] of Object.entries(groups.groups)) {
    if (g.subjects.includes(targetId)) targetGroups.add(gid);
  }
  for (const gid of targetGroups) {
    if (groups.groups[gid]?.subjects.includes(sid)) return true;
  }
  return false;
}

export function resetSubjectGroupsCache(): void {
  groupsCache = null;
  nameToIdCache = null;
  modelIdsCache = null;
}
