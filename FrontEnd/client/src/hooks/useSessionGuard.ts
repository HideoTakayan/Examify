import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { fetchSession } from '@/services/authApi';
import useAuth from '@/hooks/useAuth';
import { connectAuthSessionSocket } from '@/services/authSessionSocket';
import { redirectToPasswordChange } from '@/services/redirectToPasswordChange';

/**
 * Giữ một phiên / trình duyệt:
 * - Socket: logout ngay khi login thiết bị khác (auth:session_revoked).
 * - Mọi API khác: 401/403 → apiClient interceptor.
 * - HTTP /auth/session: chỉ khi mount, tab focus lại, hoặc socket reconnect (không poll định kỳ).
 */
export function useSessionGuard(): void {
  const { authenticated, accessToken } = useAuth();

  useEffect(() => {
    if (!authenticated || !accessToken) return;

    const check = () => {
      void fetchSession()
        .then((session) => {
          if (session.requires_password_change) {
            redirectToPasswordChange();
          }
        })
        .catch(() => {
          /* 401 → apiClient interceptor */
        });
    };

    const socket: Socket = connectAuthSessionSocket(accessToken);
    socket.on('connect', check);

    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onFocus = () => check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      socket.off('connect', check);
      socket.close();
    };
  }, [authenticated, accessToken]);
}
