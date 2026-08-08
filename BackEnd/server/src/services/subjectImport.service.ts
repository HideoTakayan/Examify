import * as XLSX from "xlsx";
import { getSubjectGroupById } from "~/models/subjectGroup.model";
import { getSubjectByName } from "~/models/subject.model";
import { createSubjectWithPrerequisites } from "~/services/subject.service";

const VALID_CATEGORIES = new Set([
  "general",
  "programming",
  "math",
  "english",
  "network",
  "ai_ml",
  "software_eng",
]);

const CATEGORY_ALIASES: Record<string, string> = {
  "tổng quát": "general",
  "tong quat": "general",
  general: "general",
  "lập trình": "programming",
  "lap trinh": "programming",
  programming: "programming",
  toán: "math",
  toan: "math",
  math: "math",
  "tiếng anh": "english",
  "tieng anh": "english",
  english: "english",
  mạng: "network",
  mang: "network",
  network: "network",
  "ai / ml": "ai_ml",
  "ai/ml": "ai_ml",
  ai_ml: "ai_ml",
  "công nghệ phần mềm": "software_eng",
  "cong nghe phan mem": "software_eng",
  software_eng: "software_eng",
  cnpm: "software_eng",
};

export type SubjectImportPreviewRow = {
  row: number;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  status: "ok" | "error";
  message: string;
};

export type SubjectImportConfirmRow = {
  name: string;
  code?: string;
  credits?: number;
  semester?: number;
  category?: string;
};

function cell(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function parseNumber(raw: string, fallback: number): number {
  if (!raw.trim()) return fallback;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "general";
  if (VALID_CATEGORIES.has(key)) return key;
  return CATEGORY_ALIASES[key] ?? "general";
}

export function buildSubjectImportTemplateBuffer(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ["ten_mon", "ma_mon", "tin_chi", "hoc_ky", "loai", "ghi_chu"],
    [
      "Lập trình C",
      "CNTT101",
      3,
      1,
      "programming",
      "ten_mon bắt buộc; loai: general, programming, math, english, network, ai_ml, software_eng",
    ],
    ["Cấu trúc dữ liệu", "CNTT102", 3, 2, "programming", ""],
    ["Toán rời rạc", "MATH201", 3, 3, "math", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MonHoc");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function parseSubjectImportExcel(buffer: Buffer): SubjectImportPreviewRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const out: SubjectImportPreviewRow[] = [];
  let rowNum = 1;
  for (const raw of rows) {
    rowNum += 1;
    const name = cell(raw, "ten_mon", "Tên môn", "Ten mon", "name", "ten");
    const code = cell(raw, "ma_mon", "Mã môn", "Ma mon", "code");
    const creditsRaw = cell(raw, "tin_chi", "Tín chỉ", "Tin chi", "credits");
    const semesterRaw = cell(raw, "hoc_ky", "Học kỳ", "Hoc ky", "semester");
    const categoryRaw = cell(raw, "loai", "Loại", "Loai", "category");

    if (!name && !code) continue;

    if (!name) {
      out.push({
        row: rowNum,
        name: "",
        code,
        credits: 0,
        semester: 0,
        category: "general",
        status: "error",
        message: "Thiếu tên môn (ten_mon)",
      });
      continue;
    }

    out.push({
      row: rowNum,
      name,
      code,
      credits: parseNumber(creditsRaw, 0),
      semester: parseNumber(semesterRaw, 0),
      category: normalizeCategory(categoryRaw),
      status: "ok",
      message: "Sẵn sàng import",
    });
  }
  return out;
}

export async function enrichSubjectImportPreview(
  rows: SubjectImportPreviewRow[],
  programId: string,
  subjectGroupId: string
): Promise<SubjectImportPreviewRow[]> {
  const group = await getSubjectGroupById(subjectGroupId);
  if (!group) {
    return rows.map((r) => ({
      ...r,
      status: "error" as const,
      message: "Không tìm thấy nhóm môn",
    }));
  }
  if (group.program_id !== programId) {
    return rows.map((r) => ({
      ...r,
      status: "error" as const,
      message: "Nhóm môn không thuộc chuyên ngành đã chọn",
    }));
  }

  const out: SubjectImportPreviewRow[] = [];
  for (const row of rows) {
    if (row.status === "error") {
      out.push(row);
      continue;
    }
    const existing = await getSubjectByName(row.name);
    if (existing && existing.program_id === programId) {
      out.push({
        ...row,
        status: "error",
        message: `Tên môn «${row.name}» đã tồn tại trong ngành này`,
      });
      continue;
    }
    out.push(row);
  }
  return out;
}

export async function confirmSubjectImport(
  programId: string,
  subjectGroupId: string,
  rows: SubjectImportConfirmRow[]
): Promise<{ created: number; failed: Array<{ name: string; reason: string }> }> {
  const group = await getSubjectGroupById(subjectGroupId);
  if (!group) throw new Error("Không tìm thấy nhóm môn");

  const { assignGroupsToProgram } = await import("~/models/programCatalog.model");
  await assignGroupsToProgram(programId, [subjectGroupId]);

  let created = 0;
  const failed: Array<{ name: string; reason: string }> = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) continue;
    try {
      const existing = await getSubjectByName(name);
      if (existing) {
        failed.push({ name, reason: "Tên môn đã có trong kho" });
        continue;
      }
      await createSubjectWithPrerequisites({
        name,
        code: row.code?.trim() ?? "",
        credits: row.credits ?? 0,
        semester: row.semester ?? 0,
        category: normalizeCategory(row.category ?? "general"),
        program_id: programId,
        subject_group_id: subjectGroupId,
        sub_category: group.code,
      });
      created += 1;
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Lỗi không xác định";
      failed.push({ name, reason });
    }
  }

  return { created, failed };
}
