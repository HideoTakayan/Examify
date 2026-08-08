import fs from "node:fs";
import path from "node:path";

/** Dữ liệu chuẩn 12 nhóm + 52 môn CNTT (dùng chung reseed & sync). */
export type GroupSeed = {
  code: string;
  name: string;
  description?: string;
  sort_order: number;
};

export type SubjectSeed = {
  name: string;
  code: string;
  groupCode: string;
  category: string;
  credits?: number;
  semester?: number;
};

type CurriculumProgram = {
  program_code?: string;
  program_name?: string;
  subjects?: Array<{
    code?: string;
    name?: string;
    semester?: number;
  }>;
};

type CurriculumLookup = {
  byCode: Map<string, number>;
  byName: Map<string, number>;
};

export const CNTT_CATALOG_GROUPS: GroupSeed[] = [
  {
    code: "pe",
    name: "Nhóm thể chất",
    description:
      "Sinh viên chọn 1 trong 3: Võ, Yoga, Zumba. Nếu chọn Zumba thì học cả cơ bản và nâng cao.",
    sort_order: 1,
  },
  { code: "defense", name: "Nhóm quốc phòng", sort_order: 2 },
  { code: "english", name: "Nhóm tiếng Anh", sort_order: 3 },
  { code: "ai_iot", name: "Nhóm học máy & IoT", sort_order: 4 },
  { code: "philosophy", name: "Nhóm môn triết học", sort_order: 5 },
  { code: "software", name: "Nhóm phần mềm", sort_order: 6 },
  { code: "bigdata", name: "Nhóm BigData", sort_order: 7 },
  { code: "network", name: "Nhóm Network", sort_order: 8 },
  { code: "internship", name: "Nhóm thực tập", sort_order: 9 },
  { code: "security", name: "Nhóm security", sort_order: 10 },
  { code: "soft_skills", name: "Nhóm kĩ năng mềm", sort_order: 11 },
  { code: "math", name: "Nhóm đại số", sort_order: 12 },
];

export const CNTT_CATALOG_SUBJECTS: SubjectSeed[] = [
  { name: "Lý luận và phương pháp Giáo dục thể chất 1", code: "PE001", groupCode: "pe", category: "general" },
  { name: "Võ (Cơ bản)", code: "PE002", groupCode: "pe", category: "general" },
  { name: "Yoga (Cơ bản)", code: "PE003", groupCode: "pe", category: "general" },
  { name: "Zumba(Cơ bản)", code: "PE004", groupCode: "pe", category: "general" },
  { name: "Zumba(Nâng cao)", code: "PE005", groupCode: "pe", category: "general" },
  { name: "Giáo dục quốc phòng P1", code: "ND001", groupCode: "defense", category: "general" },
  { name: "Giáo dục quốc phòng P2", code: "ND002", groupCode: "defense", category: "general" },
  { name: "Giáo dục quốc phòng P3", code: "ND003", groupCode: "defense", category: "general" },
  { name: "Giáo dục quốc phòng P4", code: "ND004", groupCode: "defense", category: "general" },
  { name: "Tiếng Anh P1", code: "ENG101", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P2", code: "ENG102", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P3", code: "ENG103", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P4", code: "ENG104", groupCode: "english", category: "english" },
  { name: "Tiếng Anh P5", code: "ENG105", groupCode: "english", category: "english" },
  { name: "Nhập môn công nghệ thông tin", code: "CS001", groupCode: "ai_iot", category: "programming" },
  { name: "Trí tuệ nhân tạo", code: "AI401", groupCode: "ai_iot", category: "ai_ml" },
  { name: "Lập trình IoT", code: "CS331", groupCode: "ai_iot", category: "programming" },
  { name: "Học máy", code: "ML501", groupCode: "ai_iot", category: "ai_ml" },
  { name: "Cấu trúc dữ liệu và giải thuật", code: "CS201", groupCode: "ai_iot", category: "programming" },
  {
    name: "Thực tập CNTT5: Triển khai ứng dụng AI, IoT",
    code: "CS105",
    groupCode: "ai_iot",
    category: "general",
  },
  { name: "Thực tập CNTT1: Hệ thống máy tính", code: "CS101", groupCode: "ai_iot", category: "general" },
  { name: "Triết học Mác - Lênin", code: "PHI001", groupCode: "philosophy", category: "general" },
  { name: "Pháp luật đại cương", code: "LAW001", groupCode: "philosophy", category: "general" },
  { name: "Tư tưởng Hồ Chí Minh", code: "PHI004", groupCode: "philosophy", category: "general" },
  { name: "Chủ nghĩa xã hội khoa học", code: "PHI003", groupCode: "philosophy", category: "general" },
  { name: "Kinh tế chính trị Mác - Lênin", code: "PHI002", groupCode: "philosophy", category: "general" },
  { name: "Lịch sử Đảng Cộng sản Việt Nam", code: "HIS001", groupCode: "philosophy", category: "general" },
  { name: "Lập trình cơ bản", code: "CS111", groupCode: "software", category: "programming" },
  { name: "Lập trình hướng đối tượng", code: "CS202", groupCode: "software", category: "programming" },
  {
    name: "Thực tập CNTT2: Thiết kế web và triển khai hệ thống phần mềm",
    code: "CS102",
    groupCode: "software",
    category: "general",
  },
  {
    name: "Thực tập CNTT3: Thiết kế, lập trình Front-End",
    code: "CS103",
    groupCode: "software",
    category: "general",
  },
  {
    name: "Thực tập CNTT4: Thiết kế, lập trình Back-End",
    code: "CS104",
    groupCode: "software",
    category: "general",
  },
  { name: "Lý thuyết, thiết kế cơ sở dữ liệu", code: "DB001", groupCode: "software", category: "programming" },
  { name: "Công nghệ phần mềm", code: "SE601", groupCode: "software", category: "software_eng" },
  { name: "Lập trình mobile", code: "CS621", groupCode: "software", category: "software_eng" },
  { name: "Kiểm thử phần mềm", code: "SE802", groupCode: "software", category: "software_eng" },
  { name: "Công nghệ dữ liệu", code: "DT501", groupCode: "bigdata", category: "ai_ml" },
  { name: "Dữ liệu lớn", code: "BD601", groupCode: "bigdata", category: "ai_ml" },
  { name: "Phân tích, thiết kế hệ thống thông tin", code: "SA001", groupCode: "bigdata", category: "general" },
  { name: "Hệ thống thông tin địa lý", code: "GIS001", groupCode: "network", category: "network" },
  { name: "Mạng máy tính", code: "NET301", groupCode: "network", category: "network" },
  {
    name: "Thực tập CNTT6: Cài đặt, cấu hình máy chủ, mạng, triển khai ứng dụng",
    code: "CS106",
    groupCode: "network",
    category: "general",
  },
  { name: "Lập trình mạng", code: "NET801", groupCode: "network", category: "network" },
  { name: "Chuyển đổi số", code: "DS801", groupCode: "internship", category: "general" },
  {
    name: "Ứng dụng Công nghệ thông tin trong doanh nghiệp",
    code: "IT001",
    groupCode: "internship",
    category: "general",
  },
  { name: "Thực tập tốt nghiệp", code: "INT001", groupCode: "internship", category: "general" },
  { name: "An toàn, bảo mật thông tin", code: "SEC001", groupCode: "security", category: "network" },
  { name: "Kỹ năng mềm cơ bản", code: "SKL001", groupCode: "soft_skills", category: "general" },
  { name: "Kỹ năng mềm nâng cao", code: "SKL002", groupCode: "soft_skills", category: "general" },
  { name: "Đại số tuyến tính, tối ưu", code: "MATH001", groupCode: "math", category: "math" },
  { name: "Toán rời rạc", code: "MATH201", groupCode: "math", category: "math" },
  { name: "Toán giải tích", code: "MATH101", groupCode: "math", category: "math" },
  {
    name: "Xác suất thống kê và phân tích dữ liệu",
    code: "STAT001",
    groupCode: "math",
    category: "math",
  },
];

const BASE_GROUP_CODES = new Set(["pe", "defense", "english", "philosophy"]);

export function scopeForCnttGroup(code: string): "base" | "shared" | "catalog" {
  if (BASE_GROUP_CODES.has(code)) return "base";
  if (["math", "programming", "software", "ai_iot", "network", "software_eng"].includes(code)) {
    return "shared";
  }
  return "catalog";
}

/** Mã nhóm CNTT chuẩn (không prefix ngành khác). */
export const CNTT_GROUP_CODES = new Set(CNTT_CATALOG_GROUPS.map((g) => g.code));

const CURRICULUM_FILE_CANDIDATES = [
  path.resolve(__dirname, "../../../scripts/dainam_cntt_subjects.json"),
  path.resolve(__dirname, "../../../scripts/dainam_subjects.json"),
  path.resolve(
    "C:/Users/admin/OneDrive/Luu drive/OneDrive/May tinh/craw/dainam_subjects.json"
  ),
  path.resolve(
    "C:/Users/admin/OneDrive/Lưu drive/OneDrive/Máy tính/craw/dainam_subjects.json"
  ),
];

const SUBJECT_NAME_ALIASES: Record<string, string[]> = {
  "Lý thuyết, thiết kế cơ sở dữ liệu": ["Lý thuyết và thiết kế cơ sở dữ liệu"],
  "Tiếng Anh P5": ["Tiếng Anh chuyên ngành"],
};

let curriculumLookupCache: CurriculumLookup | null | undefined;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bva\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value: string): string {
  return value
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "");
}

function loadCurriculumLookup(): CurriculumLookup | null {
  if (curriculumLookupCache !== undefined) return curriculumLookupCache;

  for (const candidate of CURRICULUM_FILE_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;

    const raw = JSON.parse(fs.readFileSync(candidate, "utf8")) as CurriculumProgram[] | CurriculumProgram;
    const programs = Array.isArray(raw) ? raw : [raw];
    const cntt = programs.find((program) => {
      const code = normalizeText(program.program_code ?? "");
      const name = normalizeText(program.program_name ?? "");
      return code === "cong nghe thong tin" || name === "cong nghe thong tin";
    });

    if (!cntt?.subjects?.length) continue;

    const byCode = new Map<string, number>();
    const byName = new Map<string, number>();

    for (const subject of cntt.subjects) {
      if (typeof subject.semester !== "number") continue;

      const code = normalizeCode(subject.code ?? "");
      if (code) byCode.set(code, subject.semester);

      const name = normalizeText(subject.name ?? "");
      if (name) byName.set(name, subject.semester);
    }

    curriculumLookupCache = { byCode, byName };
    return curriculumLookupCache;
  }

  curriculumLookupCache = null;
  return curriculumLookupCache;
}

export function enrichCnttSubjectFromCurriculum(subject: SubjectSeed): SubjectSeed {
  const lookup = loadCurriculumLookup();
  if (!lookup) {
    return subject.groupCode === "pe" && subject.semester === undefined
      ? { ...subject, semester: 0 }
      : subject;
  }

  const codeSemester = lookup.byCode.get(normalizeCode(subject.code));
  if (codeSemester !== undefined) {
    return { ...subject, semester: codeSemester };
  }

  const candidateNames = [subject.name, ...(SUBJECT_NAME_ALIASES[subject.name] ?? [])];
  for (const name of candidateNames) {
    const semester = lookup.byName.get(normalizeText(name));
    if (semester !== undefined) {
      return { ...subject, semester };
    }
  }

  if (subject.groupCode === "pe" && subject.semester === undefined) {
    return { ...subject, semester: 0 };
  }

  return subject;
}
