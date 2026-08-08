# Mẫu email (`src/emails`)

Tách riêng nội dung HTML/text khỏi logic gửi (`email.service.ts`).

## Cấu trúc

```
emails/
  layout.ts          # Khung HTML chung + escapeHtml()
  catalog.ts         # Danh mục mẫu (đọc trước khi thêm case mới)
  index.ts           # Export tất cả builder
  templates/         # Mỗi file = một loại email
    passwordResetApproved.ts
    forgotPasswordLink.ts
    examDeadlineReminder.ts
    examNotification.ts
    gradeReportTable.ts
    examGradeResult.ts
```

## Thêm mẫu mới

1. Tạo `templates/myTemplate.ts` export `buildMyTemplateEmail(params) => { subject, html, text }`.
2. Export từ `index.ts` và thêm dòng vào `catalog.ts`.
3. Gọi từ `email.service.ts`: `sendMyTemplate(to, params)` hoặc `sendEmail` + builder.

## Gửi mail

- **From:** `MAIL_FROM` (env) — hệ thống / admin
- **To:** email động từ DB (sinh viên, GV…)
- Production Render Free: ưu tiên `RESEND_API_KEY` (HTTPS), không dùng SMTP port 587
