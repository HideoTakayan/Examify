import type { EmailTemplateId } from "./types";

/**
 * Danh mục mẫu email — thêm case mới: tạo file trong templates/ rồi export từ index.ts.
 *
 * | ID                      | File                         | Khi nào gửi                    | To (động)      |
 * |-------------------------|------------------------------|--------------------------------|----------------|
 * | password_reset_approved   | passwordResetApproved.ts     | Admin duyệt reset MK           | email SV       |
 * | forgot_password_link      | forgotPasswordLink.ts        | SV quên MK                     | email SV       |
 * | exam_deadline_reminder    | examDeadlineReminder.ts      | Job nhắc 24h / 1h              | BCC cả lớp     |
 * | exam_notification         | examNotification.ts          | Thông báo bài thi (tùy loại)  | email SV       |
 * | grade_report_table        | gradeReportTable.ts          | GV gửi bảng điểm               | email SV       |
 * | exam_grade_result         | examGradeResult.ts           | Kết quả 1 bài thi              | email SV       |
 *
 * Gợi ý mở rộng (chưa implement):
 * - account_created: tài khoản mới + MK tạm
 * - password_changed: đổi MK thành công
 * - exam_force_submit: bị ép nộp bài
 * - proctor_alert: cảnh báo giám thị
 * - essay_graded: đã chấm tự luận
 */
export const EMAIL_TEMPLATE_CATALOG: { id: EmailTemplateId; description: string }[] = [
  { id: "password_reset_approved", description: "Mật khẩu tạm sau khi admin duyệt reset" },
  { id: "forgot_password_link", description: "Link đặt lại mật khẩu (quên MK)" },
  { id: "exam_deadline_reminder", description: "Nhắc hạn bắt đầu thi (24h / 1h)" },
  { id: "exam_notification", description: "Thông báo chung về bài thi" },
  { id: "grade_report_table", description: "Bảng điểm nhiều bài (GV gửi email)" },
  { id: "exam_grade_result", description: "Kết quả điểm một bài thi" },
];
