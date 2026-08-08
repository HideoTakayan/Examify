/**
 * TẦNG 2 — Đánh giá định tính bằng AI (COMPRESSED PROMPT ≤ 400 token)
 *
 * Triết lý: KHÔNG gửi đề thi, KHÔNG gửi 52 điểm môn học, KHÔNG gửi
 * knowledge base. Chỉ gửi bản tóm tắt đã nén do Tầng 1 sinh ra.
 *
 * Input mẫu (~150 byte):
 *   {
 *     "gpa": 6.9,
 *     "predicted": 7.4,
 *     "subject": "Kiểm thử phần mềm",
 *     "class_avg": 8.5,
 *     "weak": ["An toàn TT", "Chuyển đổi số"],
 *     "exam_score": 7.1
 *   }
 *
 * Output: nhận xét ngôn ngữ tự nhiên (1-2 đoạn, ≤ 500 token).
 */

import { env } from "~/config/enviroment";
import type { PredictOutput } from "~/services/gradePredictor.service";

// ============== Public types ==============
export interface EvaluationSummary {
  student_gpa: number;
  subject: string;
  /** Nhóm môn target thuộc về (vd: ["software"]). */
  subject_groups?: string[];
  predicted_score: number;
  class_avg: number;
  percentile: number;
  weak_topics: string[];
  /** Chương/chủ điểm yếu rút ra từ bài thi gần nhất. */
  weak_chapters?: string[];
  /** Nhóm SV YẾU hơn lớp (vd: [{label:"Phần mềm", diff:-0.6}]). */
  weak_groups?: Array<{ label: string; diff: number }>;
  /** Nhóm SV MẠNH hơn lớp. */
  strong_groups?: Array<{ label: string; diff: number }>;
  /** Điểm thi thực tế nếu đã có (so sánh với dự đoán). */
  exam_score?: number;
  /** Số môn đã hoàn thành (giữ để tương thích, không cần nêu ra cho người dùng). */
  n_completed?: number;
}

export interface EvaluationResult {
  remark: string; // nhận xét học lực tổng quan
  weaknesses: string[]; // điểm yếu cần cải thiện
  advice: string[]; // lời khuyên học tập cụ thể
  comparison: string; // so sánh với lớp
  raw_text: string; // nguyên văn AI trả về (debug)
  tokens_used?: number;
}

// ============== System prompt (CỐ ĐỊNH, ngắn) ==============
const SYSTEM_PROMPT = `Bạn là giáo viên đại học ngành CNTT, đánh giá kết quả học tập của sinh viên dựa trên dữ liệu có sẵn.
Nhiệm vụ: nhận xét học lực, chỉ ra điểm yếu/mạnh, đưa lời khuyên cụ thể.
Quy tắc quan trọng:
- CHỈ nhận xét về nhóm môn LIÊN QUAN đến môn đang dự báo. VD: nếu dự báo "Lập trình mobile" (nhóm Phần mềm) thì KHÔNG nhắc đến nhóm Toán/Đại số.
- Ưu tiên rút ra điểm yếu từ các chương/chủ điểm sai ở bài thi gần nhất nếu có.
- KHÔNG dùng từ "lớp" (vd: "ĐTB lớp", "so với lớp"). Thay bằng "dữ liệu tham khảo" hoặc "trung bình chung".
- KHÔNG nói "kiểm tra lại mô hình dự báo". Nếu điểm dự báo chênh lệch, ghi "kết quả chỉ mang tính tham khảo".
- KHÔNG nhắc đến R², hệ số hồi quy, cùng nhóm, số môn đã hoàn thành, hay việc dữ liệu ít.
- KHÔNG bịa thêm số liệu ngoài dữ liệu được cung cấp.
- Chỉ nhận xét nhóm_yếu/nhóm_mạnh khi giá trị khác "-".
Trả lời ngắn gọn bằng tiếng Việt, đúng cấu trúc JSON, không thêm chữ ngoài JSON.
KHÔNG suy luận, KHÔNG dùng thẻ <think>, trả ra JSON ngay lập tức.`;

// ============== Builder cho user prompt ==============
/**
 * Build user prompt CỰC NGẮN.
 * Mục tiêu: tổng (system + user + output schema) ≤ 400 token.
 */
function buildUserPrompt(s: EvaluationSummary): string {
  const targetGroups = s.subject_groups ?? [];

  const weakSubj = s.weak_topics.length
    ? s.weak_topics.slice(0, 3).join(", ")
    : "-";
  const weakChapters = s.weak_chapters?.length
    ? s.weak_chapters.slice(0, 3).join(", ")
    : "-";

  const subjGroups = targetGroups.join(",");
  const groupCtx = subjGroups ? ` [nhóm:${subjGroups}]` : "";

  return `Tóm tắt SV:
- môn_dự_báo="${s.subject}"${groupCtx}
- predicted=${s.predicted_score}, class_avg=${s.class_avg}, percentile=${s.percentile}%${typeof s.exam_score === "number" ? `, exam=${s.exam_score}` : ""}
- môn_yếu=[${weakSubj}]
- chương_yếu_từ_bài_gần_nhất=[${weakChapters}]

Trả về CHỈ JSON:
{"remark":"1-2 câu nhận xét học lực, gắn với nhóm môn đang dự báo","weaknesses":["…"],"advice":["…","…"],"comparison":"so với dữ liệu tham khảo, 1 câu"}`;
}

// ============== Builder summary từ Tầng 1 output ==============
/**
 * Tiện ích: chuyển PredictOutput (Tầng 1) → EvaluationSummary (Tầng 2)
 * Dùng khi caller chỉ có kết quả predict và muốn xin nhận xét luôn.
 */
export function summaryFromPrediction(
  pred: PredictOutput,
  gpa: number,
  examScore?: number,
  nCompleted?: number,
  weakChapters: string[] = []
): EvaluationSummary {
  return {
    student_gpa: +gpa.toFixed(2),
    subject: pred.subject_name,
    subject_groups: pred.subject_groups,
    predicted_score: pred.predicted_score,
    class_avg: pred.class_avg,
    percentile: pred.percentile,
    weak_topics: pred.weak_subjects.map((w) => w.name),
    weak_chapters: weakChapters,
    weak_groups: pred.weak_groups.map((g) => ({ label: g.label, diff: g.diff })),
    strong_groups: pred.strong_groups.map((g) => ({
      label: g.label,
      diff: g.diff,
    })),
    exam_score: examScore,
    n_completed: nCompleted,
  };
}

// ============== Parser an toàn ==============
function safeParse(raw: string): Partial<EvaluationResult> {
  // Strip thẻ <think>...</think> nếu model có reasoning trace
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Cũng strip trường hợp <think> không có đóng (bị truncate giữa chừng)
  cleaned = cleaned.replace(/<think>[\s\S]*$/i, "").trim();

  // Lấy block JSON: ưu tiên ```json ... ```, sau đó là { ... } cuối cùng
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  let jsonStr: string;
  if (fenced) {
    jsonStr = fenced[1];
  } else {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    jsonStr = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    // Cố gắng vớt vát: nếu JSON bị cắt đuôi, đóng dấu } cho đến khi parse được
    let attempt = jsonStr.trim();
    for (let i = 0; i < 5; i++) {
      attempt += "}";
      try {
        return JSON.parse(attempt);
      } catch {
        /* tiếp tục thử */
      }
    }
    return {};
  }
}

// ============== Hàm chính ==============
/**
 * Gọi MiniMax với prompt đã nén. Có fallback mock khi không có API key
 * (hữu ích cho dev/test khỏi tốn token).
 */
export async function evaluateStudent(
  summary: EvaluationSummary
): Promise<EvaluationResult> {
  // ----- Fallback: không có API key → trả về evaluation rule-based -----
  if (!env.MINIMAX_API_KEY) {
    return mockEvaluate(summary);
  }

  const userPrompt = buildUserPrompt(summary);

  const response = await fetch(
    `${env.MINIMAX_BASE_URL}/text/chatcompletion_v2`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.MINIMAX_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`MiniMax error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const raw = json.choices?.[0]?.message?.content ?? "";

  const parsed = safeParse(raw);

  return {
    remark: parsed.remark ?? "Chưa có đủ dữ liệu để nhận xét.",
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    advice: Array.isArray(parsed.advice) ? parsed.advice : [],
    comparison: parsed.comparison ?? "",
    raw_text: raw,
    tokens_used: json.usage?.total_tokens,
  };
}

// ============== Mock (rule-based, không tốn token) ==============
function mockEvaluate(s: EvaluationSummary): EvaluationResult {
  const diff = +(s.predicted_score - s.class_avg).toFixed(2);
  const chapterFocus = s.weak_chapters?.slice(0, 2) ?? [];
  let remark: string;
  if (s.predicted_score >= 8.5) {
    remark = `Mức độ sẵn sàng cho môn "${s.subject}" đang khá tốt (ước lượng ${s.predicted_score}/10), ${diff > 0 ? "trên" : "xấp xỉ"} trung bình chung của dữ liệu tham khảo.`;
  } else if (s.predicted_score >= 7) {
    remark = `Mức độ sẵn sàng cho môn "${s.subject}" ở mức khá (ước lượng ${s.predicted_score}/10), ${diff >= 0 ? "nhỉnh hơn" : "thấp hơn"} trung bình chung ${Math.abs(diff)} điểm.`;
  } else if (s.predicted_score >= 5.5) {
    remark = `Mức độ sẵn sàng cho môn "${s.subject}" ở mức trung bình (ước lượng ${s.predicted_score}/10), cần củng cố thêm kiến thức nền liên quan.`;
  } else {
    remark = `Mức độ sẵn sàng cho môn "${s.subject}" hiện còn thấp (ước lượng ${s.predicted_score}/10), nên ưu tiên ôn lại các chủ điểm đang hổng trước khi học tiếp.`;
  }

  const weaknesses = chapterFocus.length > 0
    ? chapterFocus.map((item) => `Cần củng cố ${item}`)
    : s.weak_topics.length > 0
      ? s.weak_topics.map((t) => `Cần củng cố kiến thức nền từ môn ${t}`)
    : ["Chưa phát hiện điểm yếu rõ rệt từ dữ liệu lịch sử"];

  const advice: string[] = [];
  if (s.predicted_score < s.class_avg) {
    advice.push(
      `Ôn lại các chủ điểm nền tảng: ${chapterFocus.join(", ") || s.weak_topics.slice(0, 2).join(", ") || "kiến thức cơ bản"}`
    );
  }
  if (s.percentile < 30) {
    advice.push("Tham gia nhóm học hoặc nhờ trợ giảng hỗ trợ trong 2-3 tuần tới");
  } else if (s.percentile > 70) {
    advice.push("Duy trì phong độ, có thể thử các bài nâng cao");
  } else {
    advice.push("Luyện tập đều đặn 30-60 phút/ngày để cải thiện kết quả");
  }
  if (typeof s.exam_score === "number") {
    const examDiff = +(s.exam_score - s.predicted_score).toFixed(2);
    if (Math.abs(examDiff) >= 1) {
      advice.push(
        `Điểm thi gần nhất (${s.exam_score}) cho thấy năng lực thực tế có thể tốt hơn hoặc khác với mức dự báo, nên kết hợp thêm quá trình ôn tập hiện tại`
      );
    }
  }

  const comparison =
    `Percentile ${s.percentile}%, chênh lệch ${diff > 0 ? "+" : ""}${diff} điểm so với trung bình dữ liệu tham khảo.`;

  return {
    remark,
    weaknesses,
    advice,
    comparison,
    raw_text: "[mock — MINIMAX_API_KEY chưa cấu hình]",
  };
}
