/**
 * Mẫu email hệ thống — chỉnh nội dung tại src/emails/templates/
 * Gửi mail qua email.service (SMTP hoặc Resend API).
 */
export type { EmailContent, EmailTemplateId } from "./types";
export { escapeHtml, wrapEmailLayout } from "./layout";
export { EMAIL_TEMPLATE_CATALOG } from "./catalog";

export { buildPasswordResetApprovedEmail } from "./templates/passwordResetApproved";
export type { PasswordResetApprovedParams } from "./templates/passwordResetApproved";

export { buildForgotPasswordLinkEmail } from "./templates/forgotPasswordLink";
export type { ForgotPasswordLinkParams } from "./templates/forgotPasswordLink";

export { buildExamDeadlineReminderEmail } from "./templates/examDeadlineReminder";
export type {
  ExamDeadlineReminderKind,
  ExamDeadlineReminderParams,
} from "./templates/examDeadlineReminder";

export { buildExamNotificationEmail } from "./templates/examNotification";
export type { ExamNotificationKind, ExamNotificationParams } from "./templates/examNotification";

export { buildGradeReportTableEmail } from "./templates/gradeReportTable";
export type { GradeReportRow, GradeReportTableParams } from "./templates/gradeReportTable";

export { buildExamGradeResultEmail } from "./templates/examGradeResult";
export type { ExamGradeResultParams } from "./templates/examGradeResult";
