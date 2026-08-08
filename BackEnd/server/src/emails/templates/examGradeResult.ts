import { escapeHtml, wrapEmailLayout } from "../layout";
import type { EmailContent } from "../types";
import { formatScoreScale10Pair } from "~/utils/gradeScale";

export type ExamGradeResultParams = {
  examTitle: string;
  score: number;
  maxScore: number;
  submittedAt: string;
};

/** Kết quả một bài thi (điểm + %). */
export function buildExamGradeResultEmail(params: ExamGradeResultParams): EmailContent {
  const title = escapeHtml(params.examTitle);
  const scoreLabel = formatScoreScale10Pair(params.score, params.maxScore);
  const percentage =
    params.maxScore > 0 ? Math.round((params.score / params.maxScore) * 1000) / 10 : 0;
  const submitted = escapeHtml(params.submittedAt);
  const subject = `[Kết quả thi] ${params.examTitle}`;

  const html = wrapEmailLayout(`
    <h2>Kết quả bài thi</h2>
    <div style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px;">📝 ${title}</div>
    <div style="font-size:48px;font-weight:bold;color:#2563eb;text-align:center;margin:20px 0;">${scoreLabel}</div>
    <div style="font-size:20px;color:#6b7280;text-align:center;margin-bottom:20px;">${percentage}%</div>
    <p style="font-size:14px;color:#374151;">Ngày nộp: ${submitted}</p>
    <p>Xem chi tiết kết quả trong hệ thống thi trực tuyến.</p>
  `);

  const text =
    `Kết quả bài thi: ${params.examTitle}\n` +
    `Điểm: ${scoreLabel} (${percentage}%)\n` +
    `Ngày nộp: ${params.submittedAt}`;

  return { subject, html, text };
}
