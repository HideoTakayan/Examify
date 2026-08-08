const CHANGE_PASSWORD_PATH = '/change-password-required';

export function redirectToPasswordChange(): void {
  if (window.location.pathname.startsWith(CHANGE_PASSWORD_PATH)) return;
  window.location.replace(CHANGE_PASSWORD_PATH);
}
