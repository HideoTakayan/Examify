import nodemailer from "nodemailer";
import { env } from "~/config/enviroment";
import {
  buildExamDeadlineReminderEmail,
  buildExamGradeResultEmail,
  buildExamNotificationEmail,
  buildForgotPasswordLinkEmail,
  buildGradeReportTableEmail,
  buildPasswordResetApprovedEmail,
  type ExamDeadlineReminderKind,
  type ExamDeadlineReminderParams,
  type ExamGradeResultParams,
  type ExamNotificationKind,
  type ExamNotificationParams,
  type ForgotPasswordLinkParams,
  type GradeReportTableParams,
  type PasswordResetApprovedParams,
} from "~/emails";

let _transporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.MAIL_FROM) return null;
  if (!_transporter) {
    const useTlsOn587 = env.SMTP_PORT === 587 && !env.SMTP_SECURE;
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: useTlsOn587,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return _transporter;
}

function usesResendApi(): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: env.MAIL_FROM,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html?.replace(/<[^>]*>/g, ""),
  };
  if (opts.bcc?.length) {
    body.bcc = opts.bcc;
    body.to = env.MAIL_FROM;
  } else {
    body.to = [opts.to];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    let parsedMessage = detail;
    try {
      const json = JSON.parse(detail) as { message?: string };
      if (json.message) parsedMessage = json.message;
    } catch {
      /* raw text */
    }
    const err = new Error(formatResendError(res.status, parsedMessage)) as Error & {
      statusCode?: number;
    };
    err.statusCode = res.status;
    throw err;
  }
}

function formatResendError(status: number, message: string): string {
  if (status === 403 && /verify a domain|only send testing emails/i.test(message)) {
    return (
      "Resend: chưa verify domain — chỉ gửi thử được tới email đăng ký tài khoản Resend. " +
      "Vào resend.com → Domains → thêm examify.local, cập nhật DNS, rồi đặt MAIL_FROM dạng noreply@examify.local"
    );
  }
  return `Resend API lỗi (${status}): ${message.slice(0, 280)}`;
}

async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
}): Promise<void> {
  const t = getSmtpTransporter();
  if (!t) throw new Error("SMTP chưa cấu hình — đặt SMTP_HOST và MAIL_FROM trong .env");

  if (opts.bcc?.length) {
    await t.sendMail({
      from: env.MAIL_FROM,
      to: env.MAIL_FROM,
      bcc: opts.bcc.filter(Boolean),
      subject: opts.subject,
      text: opts.text ?? opts.html?.replace(/<[^>]*>/g, ""),
      html: opts.html,
    });
    return;
  }

  await t.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

async function dispatchEmail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  bcc?: string[];
}): Promise<void> {
  if (usesResendApi()) {
    await sendViaResend(opts);
    return;
  }
  await sendViaSmtp(opts);
}

export function isEmailConfigured(): boolean {
  return usesResendApi() || Boolean(getSmtpTransporter());
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  await dispatchEmail({ to, subject, html, text });
}

export async function sendPasswordReset(
  to: string,
  tempPassword: string,
  fullName?: string
): Promise<void> {
  const { subject, html, text } = buildPasswordResetApprovedEmail({
    fullName,
    tempPassword,
  } satisfies PasswordResetApprovedParams);
  await dispatchEmail({ to, subject, html, text });
}

export async function sendForgotPasswordLink(
  to: string,
  params: ForgotPasswordLinkParams
): Promise<void> {
  const { subject, html, text } = buildForgotPasswordLinkEmail(params);
  await dispatchEmail({ to, subject, html, text });
}

export async function sendExamNotification(
  to: string,
  examTitle: string,
  message: string,
  kind: ExamNotificationKind = "reminder_24h"
): Promise<void> {
  const { subject, html, text } = buildExamNotificationEmail({
    examTitle,
    message,
    kind,
  } satisfies ExamNotificationParams);
  await dispatchEmail({ to, subject, html, text });
}

export async function sendExamDeadlineReminderBatch(
  bcc: string[],
  params: ExamDeadlineReminderParams
): Promise<void> {
  if (!bcc.length) return;
  const { subject, html, text } = buildExamDeadlineReminderEmail(params);
  await dispatchEmail({ to: env.MAIL_FROM, bcc, subject, html, text });
}

export async function sendBatchEmail(
  bcc: string[],
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  if (!bcc.length) return;
  await dispatchEmail({
    to: env.MAIL_FROM,
    bcc,
    subject,
    html,
    text: text ?? html.replace(/<[^>]*>/g, ""),
  });
}

export async function sendGradeReportTable(to: string, params: GradeReportTableParams): Promise<void> {
  const { subject, html, text } = buildGradeReportTableEmail(params);
  await dispatchEmail({ to, subject, html, text });
}

export async function sendGradeNotification(
  to: string,
  examTitle: string,
  score: number,
  maxScore: number,
  submittedAt: string
): Promise<void> {
  const { subject, html, text } = buildExamGradeResultEmail({
    examTitle,
    score,
    maxScore,
    submittedAt,
  } satisfies ExamGradeResultParams);
  await dispatchEmail({ to, subject, html, text });
}

/** @deprecated Dùng sendExamDeadlineReminderBatch — giữ tương thích job cũ */
export type { ExamDeadlineReminderKind };
