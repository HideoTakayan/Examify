import { escapeHtml, wrapEmailLayout } from "../layout";
import type { EmailContent } from "../types";

export type ForgotPasswordLinkParams = {
  fullName?: string;
  username?: string;
  resetLink: string;
  ttlHours?: number;
};

/** SV quên MK — link đặt lại mật khẩu. */
export function buildForgotPasswordLinkEmail(params: ForgotPasswordLinkParams): EmailContent {
  const displayName = escapeHtml(params.fullName?.trim() || params.username?.trim() || "bạn");
  const link = escapeHtml(params.resetLink);
  const ttl = params.ttlHours ?? 1;
  const subject = "[Hệ thống thi trực tuyến] Đặt lại mật khẩu";

  const html = wrapEmailLayout(`
    <h2>Xin chào ${displayName},</h2>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
    <p>Nhấn vào link dưới đây để đặt lại mật khẩu (hiệu lực trong ${ttl} giờ):</p>
    <p><a href="${link}">${link}</a></p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    <p>Trân trọng,<br/>Ban quản trị hệ thống thi trực tuyến.</p>
  `);

  const rawName = params.fullName?.trim() || params.username?.trim() || "bạn";
  const text =
    `Xin chào ${rawName},\n\n` +
    `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n` +
    `Nhấn vào link dưới đây để đặt lại mật khẩu (hiệu lực trong ${ttl} giờ):\n` +
    `${params.resetLink}\n\n` +
    `Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n` +
    `Trân trọng,\nBan quản trị hệ thống thi trực tuyến.`;

  return { subject, html, text };
}
