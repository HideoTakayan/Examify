/** Đang xử lý đăng xuất chủ động — tránh interceptor 401 gắn ?session=revoked. */
let voluntaryLogoutInProgress = false;

export function setVoluntaryLogout(active: boolean): void {
  voluntaryLogoutInProgress = active;
}

export function isVoluntaryLogout(): boolean {
  return voluntaryLogoutInProgress;
}
