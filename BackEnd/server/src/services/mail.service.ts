import nodemailer from "nodemailer";
import { env } from "~/config/enviroment";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.MAIL_FROM) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export function isMailConfigured(): boolean {
  return Boolean(getTransporter());
}

export async function sendMail(opts: {
  to?: string;
  bcc?: string[];
  subject: string;
  text: string;
}): Promise<void> {
  const t = getTransporter();
  if (!t || !env.MAIL_FROM) {
    throw new Error("SMTP chưa cấu hình (SMTP_HOST, MAIL_FROM)");
  }
  const bcc = opts.bcc?.filter(Boolean) ?? [];
  const to = opts.to ?? (bcc.length ? env.MAIL_FROM : "");
  if (!to) {
    throw new Error("sendMail: thiếu to hoặc bcc");
  }
  await t.sendMail({
    from: env.MAIL_FROM,
    to,
    bcc: bcc.length ? bcc : undefined,
    subject: opts.subject,
    text: opts.text,
  });
}
