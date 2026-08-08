import { io, type Socket } from 'socket.io-client';
import i18n from '@/locales';

export type ExamSocketPocResult =
  | { ok: true; serverTimeIso?: string }
  | { ok: false; message: string };

/**
 * Kiểm tra nhanh Socket.IO POC sau login (cùng host với REST, path /socket.io).
 * examId chỉ là tên room; có thể trùng UUID đề thi thật hoặc placeholder.
 */
export function runExamSocketPoc(opts: {
  apiBaseUrl: string;
  token: string;
  examId: string;
  forcePolling?: boolean;
  timeoutMs?: number;
}): Promise<ExamSocketPocResult> {
  const { apiBaseUrl, token, examId, forcePolling, timeoutMs = 12000 } = opts;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: ExamSocketPocResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.removeAllListeners();
        socket.close();
      } catch {
        /* ignore */
      }
      resolve(r);
    };

    const socket: Socket = io(apiBaseUrl, {
      path: '/socket.io',
      auth: { token },
      transports: forcePolling ? ['polling'] : ['websocket', 'polling'],
    });

    const timer = setTimeout(() => {
      finish({ ok: false, message: i18n.t('errors.realtime_timeout') });
    }, timeoutMs);

    socket.on('connect', () => {
      socket.emit('exam:join', { examId });
      socket.emit('exam:ping');
    });

    socket.on('exam:server_time', (p: { iso?: string }) => {
      finish({ ok: true, serverTimeIso: p?.iso });
    });

    socket.on('exam:error', (p: { message?: string }) => {
      finish({ ok: false, message: p?.message ?? i18n.t('errors.realtime_error') });
    });

    socket.on('connect_error', (err: Error) => {
      finish({
        ok: false,
        message: err?.message || i18n.t('errors.realtime_connect_failed'),
      });
    });
  });
}
