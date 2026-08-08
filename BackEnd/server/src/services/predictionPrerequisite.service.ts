import { getSubjectById } from "~/models/subject.model";
import { expandPrerequisites } from "~/services/subjectPrerequisite.service";
import {
  assessTargetEligibility as assessByModelName,
  getGroupsForSubject,
  hasPredictionModel,
  loadGroupsFile,
  resolveSubjectId,
  subjectInSameGroupAsTarget,
  type PredictionEligibility,
} from "~/utils/subjectGroups.util";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function historyHasName(completedNames: string[], subjectName: string): boolean {
  const n = normalizeName(subjectName);
  return completedNames.some((h) => {
    const hn = normalizeName(h);
    return hn === n || hn.includes(n) || n.includes(hn);
  });
}

const SUB_CATEGORY_GROUP_LABELS: Record<string, string> = {
  math: "Đại số / Toán",
  english: "Tiếng Anh",
  programming: "Lập trình",
  software_eng: "Phần mềm",
  se: "Phần mềm",
  mobile: "Phần mềm",
  testing: "Phần mềm",
  ai: "Học máy & IoT",
  ml: "Học máy & IoT",
  iot: "Học máy & IoT",
  big_data: "BigData",
  data_eng: "BigData",
  network: "Network",
  national_defense: "Quốc phòng",
  soft_skills: "Kỹ năng mềm",
  security: "An toàn thông tin",
  internship: "Thực tập / Doanh nghiệp",
  capstone: "Thực tập / Doanh nghiệp",
};

/** Kiểm tra dữ kiện dự đoán — ưu tiên prerequisites trong DB, fallback subject_groups.json */
export async function assessPredictionEligibility(
  targetSubjectId: string,
  completedSubjectNames: string[]
): Promise<PredictionEligibility> {
  const subject = await getSubjectById(targetSubjectId);
  if (!subject) {
    return {
      eligible: false,
      target_subject: "",
      target_id: null,
      group_labels: [],
      missing_prerequisites: [],
      scored_in_group: [],
      message: "Không tìm thấy môn học.",
    };
  }

  const prereqRefs = await expandPrerequisites(subject.prerequisites);
  const modelId = resolveSubjectId(subject.name);

  if (prereqRefs.length > 0) {
    const missing = prereqRefs
      .filter((p) => !historyHasName(completedSubjectNames, p.name))
      .map((p) => p.name);

    const scoredInGroup: string[] = [];
    for (const name of completedSubjectNames) {
      if (normalizeName(name) === normalizeName(subject.name)) continue;
      if (modelId && subjectInSameGroupAsTarget(name, modelId)) {
        if (!scoredInGroup.includes(name)) scoredInGroup.push(name);
      }
      if (prereqRefs.some((p) => normalizeName(p.name) === normalizeName(name))) {
        if (!scoredInGroup.includes(name)) scoredInGroup.push(name);
      }
    }

    const groupLabels = subject.sub_category
      ? [SUB_CATEGORY_GROUP_LABELS[subject.sub_category] ?? subject.sub_category]
      : getGroupsForSubject(subject.name)
          .map((gid) => loadGroupsFile().groups[gid]?.label)
          .filter((l): l is string => Boolean(l));

    if (!modelId || !hasPredictionModel(modelId)) {
      return {
        eligible: false,
        target_subject: subject.name,
        target_id: modelId,
        group_labels: groupLabels,
        missing_prerequisites: [],
        scored_in_group: scoredInGroup,
        message:
          "Môn này hiện chưa có đủ feature hợp lệ theo nhóm/học kỳ để tạo model dự báo điểm.",
      };
    }

    const hasContext = scoredInGroup.length > 0;
    const eligible = missing.length === 0 && completedSubjectNames.length > 0;

    let message = "";
    if (missing.length > 0) {
      message = `Chưa đủ dữ kiện: cần hoàn thành môn tiên quyết: ${missing.join(", ")}.`;
    } else if (!hasContext) {
      message = "Đủ dữ liệu để dự báo (chưa có môn cùng nhóm — kết quả mang tính tham khảo).";
    } else {
      message = "Đủ dữ liệu để đánh giá học lực và dự báo điểm.";
    }

    return {
      eligible,
      target_subject: subject.name,
      target_id: modelId,
      group_labels: groupLabels,
      missing_prerequisites: missing,
      scored_in_group: scoredInGroup,
      message,
    };
  }

  return assessByModelName(subject.name, completedSubjectNames);
}
