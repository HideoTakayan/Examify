/** Kết quả render mẫu email — dùng với email.service (gửi đi). */
export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

/** Mã mẫu — tham chiếu trong emails/catalog.ts */
export type EmailTemplateId =
  | "password_reset_approved"
  | "forgot_password_link"
  | "exam_deadline_reminder"
  | "exam_notification"
  | "grade_report_table"
  | "exam_grade_result";
