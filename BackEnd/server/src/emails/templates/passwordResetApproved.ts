import { escapeHtml, wrapEmailLayout } from "../layout";
import type { EmailContent } from "../types";

export type PasswordResetApprovedParams = {
  fullName?: string;
  tempPassword: string;
};

/** Admin duyệt reset MK — gửi mật khẩu tạm. */
export function buildPasswordResetApprovedEmail(
  params: PasswordResetApprovedParams
): EmailContent {
  const name = escapeHtml(params.fullName?.trim() || "bạn");
  const password = escapeHtml(params.tempPassword);
  const subject = "[Hệ thống thi trực tuyến] Mật khẩu tạm thời";

  const html = wrapEmailLayout(`
    <h2>Xin chào ${name},</h2>
    <p>Chúng tôi đã tạo mật khẩu tạm thời cho tài khoản của bạn:</p>
    <div style="font-size:24px;font-weight:bold;color:#2563eb;letter-spacing:4px;text-align:center;margin:20px 0;padding:12px;border:2px dashed #2563eb;border-radius:6px;">${password}</div>
    <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập thành công.</p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    <p>Trân trọng,<br/>Ban quản trị hệ thống thi trực tuyến.</p>
  `);

  const text =
    `Xin chào ${params.fullName?.trim() || "bạn"},\n\n` +
    `Mật khẩu tạm thời của bạn: ${params.tempPassword}\n\n` +
    `Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập thành công.\n` +
    `Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n` +
    `Trân trọng,\nBan quản trị hệ thống thi trực tuyến.`;

  return { subject, html, text };
}
