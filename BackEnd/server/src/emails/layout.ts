/** Escape HTML để tránh XSS trong tên/email người dùng. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BASE_STYLES = `
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 600px; margin: auto; }
  .footer { margin-top: 24px; font-size: 12px; color: #888; }
`;

/** Khung HTML chung cho hầu hết email hệ thống. */
export function wrapEmailLayout(contentHtml: string, opts?: { maxWidth?: number }): string {
  const maxWidth = opts?.maxWidth ?? 600;
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${BASE_STYLES}
    .container { max-width: ${maxWidth}px; }
  </style>
</head>
<body>
  <div class="container">
    ${contentHtml}
    <div class="footer">Email này được gửi tự động từ hệ thống đánh giá Examify (Examify Assessment Platform). Vui lòng không trả lời trực tiếp.</div>
  </div>
</body>
</html>`;
}
