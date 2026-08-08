import { io, type Socket } from 'socket.io-client';
import appConfig from '@/configs/app.config';
import { kickToLogin } from '@/services/kickToLogin';
import { isInLoginGrace } from '@/services/loginGrace';

function socketBaseUrl(): string {
  const api = appConfig.apiURL.replace(/\/+$/, '');
  try {
    return new URL(api).origin;
  } catch {
    return api;
  }
}

/** Socket chỉ để nhận auth:session_revoked — đá tab cũ ngay khi login nơi khác. */
export function connectAuthSessionSocket(token: string): Socket {
  const socket = io(socketBaseUrl(), {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
  });

  socket.on('auth:session_revoked', () => {
    if (isInLoginGrace()) return;
    void kickToLogin(true);
  });

  socket.on('connect_error', () => {
    /* token/session không còn hợp lệ — useSessionGuard HTTP sẽ xử lý */
  });

  return socket;
}
