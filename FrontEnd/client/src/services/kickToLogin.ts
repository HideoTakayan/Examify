import { clearClientSession } from '@/services/clearClientSession';

let kicking = false;

/** Đăng xuất client và về trang login (phiên bị thu hồi / 401). */
/** @param revokedElsewhere — true khi bị đá do đăng nhập thiết bị/tab khác (hiện cảnh báo trên login). */
export async function kickToLogin(revokedElsewhere = false): Promise<void> {
  if (kicking) return;
  kicking = true;
  try {
    await clearClientSession();
    const qs = revokedElsewhere ? '?session=revoked' : '';
    if (!window.location.pathname.startsWith('/login')) {
      window.location.replace(`/login${qs}`);
    }
  } finally {
    kicking = false;
  }
}
