import { escapeHtml, wrapEmailLayout } from "../layout";
import type { EmailContent } from "../types";

export type ExamDeadlineReminderKind = "24h" | "1h";

export type ExamDeadlineReminderParams = {
  examTitle: string;
  message: string;
  kind: ExamDeadlineReminderKind;
};

/** Nhắc hạn bắt đầu thi (job — gửi BCC cả lớp). */
export function buildExamDeadlineReminderEmail(
  params: ExamDeadlineReminderParams
): EmailContent {
  const title = escapeHtml(params.examTitle);
  const messageHtml = escapeHtml(params.message).replace(/\n/g, "<br/>");
  const subject =
    params.kind === "24h"
      ? `[Nhắc nhở] Bài thi sắp đến hạn bắt đầu: ${params.examTitle}`
      : `[Nhắc nhở] Bài thi còn 1 giờ để bắt đầu: ${params.examTitle}`;

  const html = wrapEmailLayout(`
    <div style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px;">📝 ${title}</div>
    <div style="font-size:15px;color:#374151;line-height:1.6;">${messageHtml}</div>
  `);

  return { subject, html, text: params.message };
}
