import path from "path";
import JSZip from "jszip";
import mammoth from "mammoth";
import { env } from "~/config/enviroment";
import type { QuestionType } from "~/models/question.model";
import {
  EXAM_PREVIEW_MEDIA_FOLDER,
  uploadMediaBuffer,
} from "~/services/cloudinary.service";

export interface MediaInfo {
  type: "image" | "audio" | "video";
  filename: string;
  status: "found" | "missing" | "embedded";
  url?: string;
  source?: "archive" | "manual";
}

export interface ImportedQuestionDraft {
  content: string;
  question_type: QuestionType;
  points: number;
  options?: Record<string, string> | null;
  correct_answer?: string | string[] | null;
  display_order: number;
  difficulty?: "DE" | "TRUNGBINH" | "KHO";
  chapter?: number | null;
  chapter_label?: string | null;
  media?: MediaInfo | null;
  media_url?: string | null;
  answer_hint?: string | null;
  ai_confidence?: number;
  needs_review?: boolean;
  review_reason?: string | null;
  /** Mã đề (0 = D01, 1 = D02) khi import nhiều file Word */
  version_index?: number;
}

export interface ImportedExamDraft {
  title?: string;
  duration_min?: number;
  description?: string;
  subject?: string;
  subject_code?: string;
  semester?: string;
  teacher?: string;
}

export interface ChapterDefinition {
  chapter: number;
  label: string;
}

export interface ExamImportPreview {
  exam: ImportedExamDraft;
  questions: ImportedQuestionDraft[];
  chapter_definitions: ChapterDefinition[];
  errors: string[];
  warnings: string[];
  parse_summary?: {
    total_parsed: number;
    auto_ok: number;
    needs_review: number;
    missing_media: number;
    parse_time_ms: number;
  };
}

interface MutableQuestionDraft {
  index: number;
  question_type: QuestionType;
  points: number;
  contentLines: string[];
  options: Record<string, string>;
  correct_answer: string | string[] | null;
  answer_hint: string | null;
  difficulty: "DE" | "TRUNGBINH" | "KHO";
  chapter: number | null;
  chapter_label: string | null;
  media: MediaInfo | null;
}

interface ReviewState {
  needs_review: boolean;
  review_reason: string | null;
}

interface ArchiveMediaEntry {
  archivePath: string;
  normalizedLookupKey: string;
  mediaType: MediaInfo["type"];
  mimeType: string;
  file: JSZip.JSZipObject;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);

function getMediaTypeFromFilename(filename: string): MediaInfo["type"] | null {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
}

function getMimeTypeFromFilename(filename: string, fallbackType?: MediaInfo["type"]): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeByExt: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
  };
  if (mimeByExt[ext]) return mimeByExt[ext];
  if (fallbackType === "image") return "image/*";
  if (fallbackType === "audio") return "audio/*";
  if (fallbackType === "video") return "video/*";
  return "application/octet-stream";
}

function normalizeMediaStem(stem: string): string {
  return stem
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_")
    .replace(/_+/g, "_");
}

export function normalizeMediaLookupKey(filename: string): string {
  const basename = path.posix.basename(filename.replace(/\\/g, "/")).trim();
  if (!basename) return "";

  const ext = path.extname(basename).trim().toLowerCase();
  const stem = ext ? basename.slice(0, -ext.length) : basename;
  const normalizedStem = normalizeMediaStem(stem);
  return `${normalizedStem}${ext}`;
}

function buildChapterDefinitionsFromQuestions(
  questions: ImportedQuestionDraft[]
): ChapterDefinition[] {
  const chapterMap = new Map<number, string>();
  for (const question of questions) {
    if (question.chapter == null) continue;
    const label = question.chapter_label?.trim();
    if (!label) continue;
    if (!chapterMap.has(question.chapter)) {
      chapterMap.set(question.chapter, label);
    }
  }

  return [...chapterMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, label]) => ({ chapter, label }));
}

function buildQuestionReviewState(
  question: Pick<
    ImportedQuestionDraft,
    "content" | "chapter" | "media" | "review_reason"
  >,
  chapterDefinitions: Map<number, string>
): ReviewState {
  if (question.media?.status === "missing") {
    return {
      needs_review: true,
      review_reason:
        question.review_reason ??
        `File ${question.media.type} "${question.media.filename}" không tìm thấy.`,
    };
  }
  if (!question.content.trim()) {
    return {
      needs_review: true,
      review_reason: "Thiếu nội dung câu hỏi.",
    };
  }
  if (question.chapter == null) {
    return {
      needs_review: true,
      review_reason: "Thiếu thẻ [CHUONG:x] cho câu hỏi.",
    };
  }
  if (chapterDefinitions.size > 0 && !chapterDefinitions.has(question.chapter)) {
    return {
      needs_review: true,
      review_reason: `Chương ${question.chapter} chưa được khai báo trong block CHUONG ở đầu file.`,
    };
  }
  return {
    needs_review: false,
    review_reason: null,
  };
}

function rebuildPreviewSummary(
  preview: ExamImportPreview,
  chapterDefinitions: Map<number, string>,
  startedAt: number
): ExamImportPreview {
  preview.questions = preview.questions.map((question) => {
    const reviewState = buildQuestionReviewState(question, chapterDefinitions);
    return {
      ...question,
      media_url: question.media?.url ?? question.media_url ?? null,
      ...reviewState,
    };
  });

  const totalParsed = preview.questions.length;
  const needsReview = preview.questions.filter((question) => question.needs_review).length;
  const missingMedia = preview.questions.filter((question) => question.media?.status === "missing").length;

  preview.parse_summary = {
    total_parsed: totalParsed,
    auto_ok: totalParsed - needsReview,
    needs_review: needsReview,
    missing_media: missingMedia,
    parse_time_ms: Date.now() - startedAt,
  };

  return preview;
}

async function resolveMediaArchiveEntries(
  mediaArchiveBuffer: Buffer,
  warnings: string[]
): Promise<Map<string, ArchiveMediaEntry[]>> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(mediaArchiveBuffer);
  } catch {
    throw new Error("File mediaArchive không phải ZIP hợp lệ hoặc đã bị lỗi.");
  }

  const entries = new Map<string, ArchiveMediaEntry[]>();
  const skippedUnsupported: string[] = [];

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const normalizedLookupKey = normalizeMediaLookupKey(relativePath);
    if (!normalizedLookupKey) return;

    const mediaType = getMediaTypeFromFilename(normalizedLookupKey);
    if (!mediaType) {
      skippedUnsupported.push(relativePath);
      return;
    }

    const normalizedPath = relativePath.replace(/\\/g, "/");
    const list = entries.get(normalizedLookupKey) ?? [];
    list.push({
      archivePath: normalizedPath,
      normalizedLookupKey,
      mediaType,
      mimeType: getMimeTypeFromFilename(normalizedLookupKey, mediaType),
      file,
    });
    entries.set(normalizedLookupKey, list);
  });

  if (skippedUnsupported.length > 0) {
    const sample = skippedUnsupported.slice(0, 3).join(", ");
    warnings.push(
      `ZIP có ${skippedUnsupported.length} file không phải media đã bị bỏ qua${
        sample ? `: ${sample}` : ""
      }.`
    );
  }

  return entries;
}

export async function resolveMediaArchiveInPreview(
  preview: ExamImportPreview,
  mediaArchiveBuffer: Buffer,
  startedAt = Date.now()
): Promise<ExamImportPreview> {
  const chapterDefinitions = new Map(
    (preview.chapter_definitions ?? []).map((item) => [item.chapter, item.label])
  );
  const archiveEntries = await resolveMediaArchiveEntries(
    mediaArchiveBuffer,
    preview.warnings
  );
  const referencedNames = new Set<string>();
  const matchedArchivePaths = new Set<string>();
  const unmatchedNames = new Set<string>();
  const ambiguousNames = new Set<string>();
  const uploadFailedNames = new Set<string>();
  const uploadCache = new Map<string, string>();

  for (const question of preview.questions) {
    const media = question.media;
    if (!media || media.url) continue;

    const lookupKey = normalizeMediaLookupKey(media.filename);
    if (!lookupKey) continue;
    referencedNames.add(lookupKey);

    const candidates = archiveEntries.get(lookupKey) ?? [];
    if (candidates.length === 0) {
      unmatchedNames.add(media.filename);
      continue;
    }

    const typeMatched = candidates.filter((item) => item.mediaType === media.type);
    if (typeMatched.length === 0) {
      unmatchedNames.add(media.filename);
      continue;
    }

    if (typeMatched.length > 1) {
      ambiguousNames.add(media.filename);
      continue;
    }

    const candidate = typeMatched[0];
    let mediaUrl = uploadCache.get(candidate.archivePath);

    if (!mediaUrl) {
      try {
        const buffer = await candidate.file.async("nodebuffer");
        const uploaded = await uploadMediaBuffer({
          buffer,
          filename: path.posix.basename(candidate.archivePath),
          mimeType: candidate.mimeType,
          folder: EXAM_PREVIEW_MEDIA_FOLDER,
          tags: ["preview-temp", "exam-import-zip"],
        });
        mediaUrl = uploaded.secure_url || uploaded.url;
        uploadCache.set(candidate.archivePath, mediaUrl);
      } catch (error) {
        uploadFailedNames.add(media.filename);
        const reason =
          error instanceof Error ? error.message : "Cloudinary upload failed.";
        question.review_reason = `Upload media từ ZIP thất bại cho "${media.filename}": ${reason}`;
        question.needs_review = true;
        preview.warnings.push(
          `Không thể upload media "${media.filename}" từ ZIP: ${reason}`
        );
        continue;
      }
    }

    matchedArchivePaths.add(candidate.archivePath);
    question.media = {
      ...media,
      status: "found",
      url: mediaUrl,
      source: "archive",
    };
    question.media_url = mediaUrl;
  }

  if (ambiguousNames.size > 0) {
    preview.warnings.push(
      `ZIP có tên file media bị trùng, hệ thống không thể tự gán: ${[
        ...ambiguousNames,
      ].join(", ")}.`
    );
  }

  if (unmatchedNames.size > 0) {
    preview.warnings.push(
      `Không tìm thấy trong ZIP các file media được tham chiếu: ${[
        ...unmatchedNames,
      ].join(", ")}.`
    );
  }
  if (uploadFailedNames.size > 0) {
    preview.warnings.push(
      `Có ${uploadFailedNames.size} file media trong ZIP upload thất bại; các câu tương ứng sẽ giữ trạng thái cần xem lại.`
    );
  }

  const extraArchiveFiles = [...archiveEntries.values()]
    .flat()
    .filter(
      (entry) =>
        !matchedArchivePaths.has(entry.archivePath) &&
        !referencedNames.has(entry.normalizedLookupKey)
    )
    .map((entry) => entry.archivePath);
  if (extraArchiveFiles.length > 0) {
    const sample = extraArchiveFiles.slice(0, 5).join(", ");
    preview.warnings.push(
      `ZIP có ${extraArchiveFiles.length} file media không được dùng trong đề${
        sample ? `: ${sample}` : ""
      }.`
    );
  }

  return rebuildPreviewSummary(preview, chapterDefinitions, startedAt);
}

const QUESTION_TYPE_MAP: Record<string, QuestionType> = {
  TN: "mcq",
  TL: "mcq", // Legacy: treat TL (tự luận) as MCQ since system is MCQ-only
  "TN-ANH": "mcq",
  "TN-AUDIO": "mcq",
  "TN-VIDEO": "mcq",
};

const DIFFICULTY_MAP: Record<string, "DE" | "TRUNGBINH" | "KHO"> = {
  DE: "DE",
  TRUNGBINH: "TRUNGBINH",
  TB: "TRUNGBINH",
  KHO: "KHO",
};

const HEADER_RE = /\[LOAI:([A-Z-]+)\]/i;
/** Dòng bắt đầu câu hỏi: cho phép dạng "[LOAI:...]" hoặc "CAU 1 [LOAI:...]" */
const QUESTION_START_RE = /^(?:(?:CAU|CÂU)\s*\d+\s+)?\[LOAI:[A-Z-]+\]/i;
const LEGACY_META_HEADER_RE = /Loại\s*:\s*\[LOAI:[A-Z-]+\]/i;

function isQuestionStartLine(line: string): boolean {
  if (LEGACY_HEADER_RE.test(line)) return true;
  if (LEGACY_META_HEADER_RE.test(line)) return true;
  if (!QUESTION_START_RE.test(line)) return false;
  const afterLoai = line.replace(/^(?:(?:CAU|CÂU)\s*\d+\s+)?\[LOAI:[A-Z-]+\]\s*/i, "");
  if (!afterLoai.trim()) return true;
  if (/^\[[A-Z]+:/i.test(afterLoai)) return true;
  return false;
}
const DIEM_RE = /\[DIEM:([\d.]+)\]/i;
const KHO_RE = /\[KHO:(\w+)\]/i;
const CHUONG_RE = /\[CHUONG:(\d+)\]/i;
const ANH_RE = /\[ANH:([^\]]+)\]/i;
const AUDIO_RE = /\[AUDIO:([^\]]+)\]/i;
const VIDEO_RE = /\[VIDEO:([^\]]+)\]/i;
const DAPAN_RE = /\[DAPAN:([^\]]+)\]/i;
const CHAPTER_DEF_RE = /^(?:CHUONG|CHƯƠNG)\s+(\d+)\s*:\s*(.+)$/i;

const LEGACY_HEADER_RE = /^Q(?:uestion)?\s*(\d+)?\s*\[(mcq|essay)\]\s*\[(\d+(?:\.\d+)?)\]\s*$/i;
const LEGACY_OPTION_RE = /^([A-Z])[\.)]\s+(.+)$/;
const LEGACY_ANSWER_RE = /^(Answer|Đáp án|Dap an|DAP AN)\s*:\s*(.+)$/i;
const LEGACY_TITLE_RE = /^(Title|Tiêu đề|Tieu de)\s*:\s*(.+)$/i;
const LEGACY_DURATION_RE = /^(Duration|Thời gian|Thoi gian)\s*:\s*(\d+)$/i;
const LEGACY_DESCRIPTION_RE = /^(Description|Mô tả|Mo ta)\s*:\s*(.*)$/i;
const ESSAY_HINT_RE = /^(Gợi ý chấm|Goi y cham|Gợi ý|Goi y)\s*:\s*(.+)$/i;

/** Dòng chỉ mang tính trang trí trong mẫu Word cũ — bỏ qua khi parse */
const SKIP_DECORATIVE_LINE_RE =
  /^(?:C\d+|TN|TL|ANH|AUDIO|VIDEO|Loại\s*:|Điểm\s*:|Độ khó\s*:|Chương\s*:|✔|→|🖼️|🔊|🎬|📝|📌|PHẦN\s|PHAN\s|Chọn\s1\sđáp|Quan\s+sát|Nghe\sđoạn|Xem\svideo|Trình\s+bày|Mỗi\scâu)/i;

/** Hướng dẫn / phân cách trong file mẫu */
const SKIP_INSTRUCTION_LINE_RE =
  /^(?:HƯỚNG\s+DẪN|GHI\s+CHÚ|BẢNG\s|PHỤ\s+LỤC|CHECKLIST|PHẦN\s+MẪU|THÔNG\s+TIN|Giải\s+thích|Lưu\s+ý|Ví\s+dụ|Ghi\s+chú|Thẻ\s+[A-Z]+:|•\s|→\s|─{3,}|\d+\.\s|Cách\s+viết|Loại\scâu|GHI\s+NHỚ|Nộp\s+file|Đặt\stên|Tên\s+file|Hệ\s+thống|\(Mẫu\s|TN\s+hoặc|TL\s+hoặc|TN-ANH|TN-AUDIO|TN-VIDEO\s*=)/i;

function normalizeText(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/ /g, " ")
    .replace(/"|"/g, '"')
    .replace(/'|'/g, "'")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function shouldSkipLine(line: string, hasCurrentQuestion: boolean): boolean {
  if (HEADER_RE.test(line)) return false;
  if (SKIP_INSTRUCTION_LINE_RE.test(line)) return true;
  if (!hasCurrentQuestion && SKIP_DECORATIVE_LINE_RE.test(line)) return true;
  if (hasCurrentQuestion && /^(?:C\d+|TN|TL|ANH|AUDIO|VIDEO)$/i.test(line)) return true;
  if (/^Tiêu chí chấm điểm$/i.test(line)) return true;
  return false;
}

function normalizeAnswer(raw: string): string | string[] {
  const parts = raw
    .split(/[,;]/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  return parts.length > 1 ? parts : parts[0] ?? "";
}

function finalizeQuestion(
  current: MutableQuestionDraft | null,
  questions: ImportedQuestionDraft[],
  errors: string[],
  warnings: string[],
  chapterDefinitions: Map<number, string>
) {
  if (!current) return;

  const content = current.contentLines.join("\n").trim();
  if (!content) {
    errors.push(`Câu ${current.index}: thiếu nội dung câu hỏi.`);
  }

  if (current.question_type === "mcq") {
    if (Object.keys(current.options).length < 2) {
      errors.push(`Câu ${current.index}: câu trắc nghiệm cần ít nhất 2 lựa chọn.`);
    }
    if (!current.correct_answer) {
      errors.push(`Câu ${current.index}: câu trắc nghiệm thiếu đáp án đúng.`);
    }
  }

  if (current.chapter == null) {
    errors.push(`Câu ${current.index}: thiếu thẻ [CHUONG:x].`);
  } else if (chapterDefinitions.size > 0 && !chapterDefinitions.has(current.chapter)) {
    errors.push(
      `Câu ${current.index}: [CHUONG:${current.chapter}] chưa được khai báo ở đầu file Word.`
    );
    current.chapter_label = null;
  } else if (current.chapter != null) {
    current.chapter_label = chapterDefinitions.get(current.chapter) ?? current.chapter_label ?? null;
  }

  const nextQuestion: ImportedQuestionDraft = {
    content,
    question_type: current.question_type,
    points: current.points,
    options: current.question_type === "mcq" ? current.options : null,
    correct_answer: current.question_type === "mcq" ? current.correct_answer : null,
    answer_hint: current.question_type === "essay" ? current.answer_hint : null,
    display_order: questions.length + 1,
    difficulty: current.difficulty,
    chapter: current.chapter,
    chapter_label: current.chapter_label,
    media: current.media,
    media_url: current.media?.url ?? null,
  };
  const reviewState = buildQuestionReviewState(nextQuestion, chapterDefinitions);
  questions.push({
    ...nextQuestion,
    ai_confidence: reviewState.needs_review ? 60 : 90,
    ...reviewState,
  });
}

function extractQuestionMetadata(line: string): {
  question_type: QuestionType;
  points: number;
  difficulty: "DE" | "TRUNGBINH" | "KHO";
  chapter: number | null;
  media: MediaInfo | null;
} {
  const typeMatch = line.match(HEADER_RE);
  const typeRaw = typeMatch?.[1]?.toUpperCase() ?? "TN";
  const question_type = QUESTION_TYPE_MAP[typeRaw] ?? "mcq";

  const diemMatch = line.match(DIEM_RE);
  let points = 1;
  if (diemMatch) {
    const raw = diemMatch[1].trim();
    if (raw && !/^[_\-.]+$/.test(raw)) {
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed) && parsed > 0) points = parsed;
    }
  }

  const khoMatch = line.match(KHO_RE);
  const difficulty = khoMatch
    ? (DIFFICULTY_MAP[khoMatch[1].toUpperCase()] ?? "DE")
    : "DE";

  const chuongMatch = line.match(CHUONG_RE);
  const chapter = chuongMatch ? parseInt(chuongMatch[1]) : null;

  const anhMatch = line.match(ANH_RE);
  const audioMatch = line.match(AUDIO_RE);
  const videoMatch = line.match(VIDEO_RE);

  let media: MediaInfo | null = null;
  if (anhMatch) {
    media = { type: "image", filename: anhMatch[1], status: "missing" };
  } else if (audioMatch) {
    media = { type: "audio", filename: audioMatch[1], status: "missing" };
  } else if (videoMatch) {
    media = { type: "video", filename: videoMatch[1], status: "missing" };
  }

  return { question_type, points, difficulty, chapter, media };
}

function extractAnswer(line: string): { answer: string | string[] | null; isHint: boolean } {
  const match = line.match(DAPAN_RE);
  if (!match) return { answer: null, isHint: false };
  const raw = match[1].trim();
  const isHint =
    raw.toUpperCase() === "GOI_Y" ||
    raw.toUpperCase() === "HINT" ||
    raw.toUpperCase() === "DA";
  return { answer: isHint ? null : normalizeAnswer(raw), isHint };
}

function parseOptions(lines: string[]): {
  options: Record<string, string>;
  answerLine: string | null;
  contentLines: string[];
} {
  const options: Record<string, string> = {};
  const contentLines: string[] = [];
  let answerLine: string | null = null;

  for (const line of lines) {
    const optionMatch = line.match(/^([A-Z])[\.)]\s+(.+)$/);
    if (optionMatch) {
      options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
      continue;
    }
    if (line.match(DAPAN_RE)) {
      answerLine = line;
      continue;
    }
    contentLines.push(line);
  }

  return { options, answerLine, contentLines };
}

export function parseExamImportText(text: string): ExamImportPreview {
  const startTime = Date.now();
  const lines = normalizeText(text);
  const exam: ImportedExamDraft = {};
  const questions: ImportedQuestionDraft[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let skippedInstructionLines = 0;

  let current: MutableQuestionDraft | null = null;
  let descriptionLines: string[] = [];
  let isLegacyMode = false;
  const chapterDefinitions = new Map<number, string>();

  for (const line of lines) {
    const chapterDefMatch = line.match(CHAPTER_DEF_RE);
    if (!current && chapterDefMatch) {
      const chapterNo = Number(chapterDefMatch[1]);
      const chapterLabel = chapterDefMatch[2]?.trim();
      if (Number.isFinite(chapterNo) && chapterNo > 0 && chapterLabel) {
        chapterDefinitions.set(chapterNo, chapterLabel);
      }
      continue;
    }

    if (SKIP_INSTRUCTION_LINE_RE.test(line)) {
      skippedInstructionLines += 1;
      continue;
    }
    if (shouldSkipLine(line, Boolean(current))) continue;

    const legacyHeaderMatch = line.match(LEGACY_HEADER_RE);
    if (legacyHeaderMatch) {
      if (current) finalizeQuestion(current, questions, errors, warnings, chapterDefinitions);
      isLegacyMode = true;
      const parsedPoints = Number(legacyHeaderMatch[3]);
      current = {
        index: questions.length + 1,
        question_type: legacyHeaderMatch[2].toLowerCase() as QuestionType,
        points: Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1,
        contentLines: [],
        options: {},
        correct_answer: null,
        answer_hint: null,
        difficulty: "DE",
        chapter: null,
        chapter_label: null,
        media: null,
      };
      continue;
    }

    if (isQuestionStartLine(line)) {
      if (current) finalizeQuestion(current, questions, errors, warnings, chapterDefinitions);
      isLegacyMode = false;

      const meta = extractQuestionMetadata(line);
      const { answer, isHint } = extractAnswer(line);

      current = {
        index: questions.length + 1,
        question_type: meta.question_type,
        points: meta.points,
        contentLines: [],
        options: {},
        correct_answer: isHint ? null : (answer as string | string[] | null),
        answer_hint: isHint ? line.replace(DAPAN_RE, "").trim() : null,
        difficulty: meta.difficulty,
        chapter: meta.chapter,
        chapter_label:
          meta.chapter != null ? chapterDefinitions.get(meta.chapter) ?? null : null,
        media: meta.media,
      };
      continue;
    }

    if (!current) {
      const titleMatch = line.match(LEGACY_TITLE_RE);
      const durationMatch = line.match(LEGACY_DURATION_RE);
      const descriptionMatch = line.match(LEGACY_DESCRIPTION_RE);
      if (titleMatch) {
        exam.title = titleMatch[2].trim();
      } else if (durationMatch) {
        exam.duration_min = Number(durationMatch[2]);
      } else if (descriptionMatch) {
        descriptionLines = [descriptionMatch[2].trim()].filter(Boolean);
      } else if (descriptionLines.length) {
        descriptionLines.push(line);
      } else if (line.length > 3 && !HEADER_RE.test(line)) {
        warnings.push(`Bỏ qua dòng ngoài câu hỏi: ${line.slice(0, 50)}`);
      }
      continue;
    }

    if (isLegacyMode) {
      const answerMatch = line.match(LEGACY_ANSWER_RE);
      if (answerMatch) {
        current.correct_answer = normalizeAnswer(answerMatch[2]);
        continue;
      }

      const optionMatch = line.match(LEGACY_OPTION_RE);
      if (optionMatch) {
        current.options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
        continue;
      }

      current.contentLines.push(line);
    } else {
      const plainAnswerMatch = line.match(LEGACY_ANSWER_RE);
      if (plainAnswerMatch) {
        current.correct_answer = normalizeAnswer(plainAnswerMatch[2]);
        continue;
      }

      const essayHintMatch = line.match(ESSAY_HINT_RE);
      if (essayHintMatch && current.question_type === "essay") {
        current.answer_hint = essayHintMatch[2].trim();
        continue;
      }

      if (line.match(DAPAN_RE)) {
        const { answer, isHint } = extractAnswer(line);
        if (isHint) {
          const hintText = line
            .replace(DAPAN_RE, "")
            .replace(/\[DAPAN:[^\]]*\]/g, "")
            .replace(/^✔\s*ĐÁP ÁN\s*:\s*/i, "")
            .replace(/^[-—]\s*/, "")
            .trim();
          current.answer_hint = hintText || current.answer_hint;
        } else {
          current.correct_answer = answer as string | string[] | null;
        }
        continue;
      }

      const { options } = parseOptions([line]);
      if (Object.keys(options).length > 0) {
        Object.assign(current.options, options);
      } else {
        current.contentLines.push(line);
      }
    }
  }

  finalizeQuestion(current, questions, errors, warnings, chapterDefinitions);
  if (descriptionLines.length) exam.description = descriptionLines.join("\n");
  const chapterDefinitionList: ChapterDefinition[] = [...chapterDefinitions.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, label]) => ({ chapter, label }));
  if (skippedInstructionLines > 0) {
    warnings.push(
      `Phát hiện ${skippedInstructionLines} dòng hướng dẫn/mẫu trong file Word và hệ thống đã tự bỏ qua. Khi tạo đề thật, nên xóa phần hướng dẫn để nội dung gọn hơn.`
    );
  }
  if (chapterDefinitionList.length === 0) {
    errors.unshift(
      "Thiếu block khai báo chương ở đầu file Word. Bắt buộc thêm dòng dạng: CHUONG 1 : Biến."
    );
  }
  if (!questions.length && errors.length === 0) {
    errors.push(
      "Không tìm thấy câu hỏi. Mỗi câu cần dòng bắt đầu có [LOAI:TN] hoặc [LOAI:TL]. Xem file mẫu exam_template_GiaoVien.docx."
    );
  }
  if (
    exam.duration_min !== undefined &&
    (!Number.isFinite(exam.duration_min) || exam.duration_min <= 0)
  ) {
    errors.push("Duration phải là số phút lớn hơn 0.");
  }

  const totalParsed = questions.length;
  const needsReview = questions.filter((q) => q.needs_review).length;
  const missingMedia = questions.filter((q) => q.media?.status === "missing").length;

  return {
    exam,
    questions,
    chapter_definitions: chapterDefinitionList,
    errors,
    warnings,
    parse_summary: {
      total_parsed: totalParsed,
      auto_ok: totalParsed - needsReview,
      needs_review: needsReview,
      missing_media: missingMedia,
      parse_time_ms: Date.now() - startTime,
    },
  };
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseExamImportDocx(
  buffer: Buffer,
  mediaArchiveBuffer?: Buffer
): Promise<ExamImportPreview> {
  const startedAt = Date.now();
  const result = await mammoth.extractRawText({ buffer });
  const preview = parseExamImportText(result.value);
  if (!mediaArchiveBuffer) return preview;
  return resolveMediaArchiveInPreview(preview, mediaArchiveBuffer, startedAt);
}
