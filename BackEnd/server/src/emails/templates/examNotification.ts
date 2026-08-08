import { escapeHtml, wrapEmailLayout } from "../layout";
import type { EmailContent } from "../types";

export type ExamNotificationKind =
  | "reminder_24h"
  | "reminder_1h"
  | "started"
  | "closed"
  | "result";

export type ExamNotificationParams = {
  examTitle: string;
  message: string;
  kind?: ExamNotificationKind;
};

const SUBJECT_PREFIX: Record<ExamNotificationKind, string> = {
  reminder_24h: "[Nhắc nhở 24h]",
  reminder_1h: "[Nhắc nhở 1h]",
  started: "[Thông báo]",
  closed: "[Thông báo]",
  result: "[Kết quả thi]",
};

/** Thông báo chung về bài thi (một người nhận). */
export function buildExamNotificationEmail(params: ExamNotificationParams): EmailContent {
  const kind = params.kind ?? "reminder_24h";
  const title = escapeHtml(params.examTitle);
  const messageHtml = escapeHtml(params.message).replace(/\n/g, "<br/>");
  const subject = `${SUBJECT_PREFIX[kind]} ${params.examTitle}`;

  const html = wrapEmailLayout(`
    <div style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px;">📝 ${title}</div>
    <div style="font-size:15px;color:#374151;line-height:1.6;">${messageHtml}</div>
  `);

  return { subject, html, text: `${params.examTitle}\n\n${params.message}` };
}
