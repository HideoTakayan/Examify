/** Bỏ qua auth:session_revoked ngay sau đăng nhập thành công (tránh tự kick). */
let loginGraceUntil = 0;

export function markLoginGrace(ms = 4000): void {
  loginGraceUntil = Date.now() + ms;
}

export function isInLoginGrace(): boolean {
  return Date.now() < loginGraceUntil;
}
