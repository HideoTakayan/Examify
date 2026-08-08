import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Cryptographically random password (default 10 chars, no ambiguous 0/O/1/l). */
export function generateRandomPassword(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length];
  }
  return out;
}
