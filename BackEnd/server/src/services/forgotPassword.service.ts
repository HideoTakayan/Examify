import bcrypt from "bcrypt";
import pool from "~/config/db";
import { generateResetToken, findValidToken, markTokenUsed } from "~/models/passwordResetToken.model";
import { getUserByEmail } from "~/models/user.model";
import { isEmailConfigured, sendForgotPasswordLink } from "./email.service";
import { env } from "~/config/enviroment";

const RESET_LINK_TTL_HOURS = 1;

export const forgotPassword = async (
  email: string
): Promise<{ sent: boolean; message: string }> => {
  const user = await getUserByEmail(email);
  if (!user) {
    return {
      sent: false,
      message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
    };
  }

  if (!isEmailConfigured()) {
    return {
      sent: false,
      message: "Hệ thống chưa cấu hình SMTP. Vui lòng liên hệ quản trị viên.",
    };
  }

  const token = await generateResetToken(user.id);
  const resetLink = `${env.APP_HOST}/reset-password?token=${token}`;

  await sendForgotPasswordLink(user.email, {
    fullName: user.full_name ?? undefined,
    username: user.username,
    resetLink,
    ttlHours: RESET_LINK_TTL_HOURS,
  });

  return {
    sent: true,
    message: "Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.",
  };
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự." };
  }

  const record = await findValidToken(token);
  if (!record) {
    return { success: false, error: "Token không hợp lệ hoặc đã hết hạn." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await Promise.all([
    pool.query(
      `UPDATE accounts SET hashed_password = $1, updated_at = NOW() WHERE id = $2`,
      [hashed, record.user_id]
    ),
    markTokenUsed(record.id),
  ]);

  return { success: true };
};