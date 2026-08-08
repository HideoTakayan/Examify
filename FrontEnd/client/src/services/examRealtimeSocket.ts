import { io, type Socket } from 'socket.io-client';

export type ForceSubmitSummary = {
  exam_id: string;
  active_sessions: number;
  submitted_sessions: number;
  failed_sessions: number;
};

export type ForceSubmitPayload = {
  examId: string;
  message?: string;
  at?: string;
  summary?: ForceSubmitSummary;
};

// P0 Fix: Violation confirmed payload from server
export type ViolationConfirmedPayload = {
  sessionId: string;
  violationId: string;
  sessionStatus: 'active' | 'submitted' | 'expired' | 'violation_locked';
  autoSubmitTriggered: boolean;
  message: string;
  at: string;
};

type RealtimeHandlers = {
  onState?: (payload: {
    examId: string;
    status: 'not_started' | 'started' | 'ended';
    startedAt?: string;
    endsAt?: string;
    durationMin?: number;
    serverNowMs?: number;
  }) => void;
  onStarted?: (payload: { examId: string; startedAt: string; endsAt: string; durationMin: number }) => void;
  onFinal15?: (payload: { examId: string; message?: string; at?: string }) => void;
  onForceSubmit?: (payload: ForceSubmitPayload) => void;
  onAlert?: (payload: { examId: string; message?: string; at?: string }) => void;
  onError?: (message: string) => void;
  onDisconnect?: () => void;
  onReconnecting?: () => void;
  onConnect?: () => void;
  // P0 Fix: Handler for server-confirmed violation
  onViolationConfirmed?: (payload: ViolationConfirmedPayload) => void;
};

export function createExamRealtimeSocket(opts: {
  baseUrl: string;
  token: string;
  examId: string;
  forcePolling?: boolean;
  handlers?: RealtimeHandlers;
}): Socket {
  const { baseUrl, token, examId, forcePolling, handlers } = opts;
  const socket: Socket = io(baseUrl, {
    path: '/socket.io',
    auth: { token },
    transports: forcePolling ? ['polling'] : ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    handlers?.onConnect?.();
    socket.emit('exam:join', { examId });
    socket.emit('exam:ping');
  });

  socket.on('disconnect', () => {
    handlers?.onDisconnect?.();
  });

  socket.on('reconnect_attempt', () => {
    handlers?.onReconnecting?.();
  });
  socket.on('reconnect_failed', () => {
    handlers?.onReconnecting?.();
  });

  socket.on('exam:state', (p) => handlers?.onState?.(p));
  socket.on('exam:started', (p) => handlers?.onStarted?.(p));
  socket.on('exam:final_15m', (p) => handlers?.onFinal15?.(p));
  socket.on('exam:force_submit', (p) => handlers?.onForceSubmit?.(p));
  socket.on('exam:alert', (p) => handlers?.onAlert?.(p));
  // P0 Fix: Listen for violation confirmed from server
  socket.on('exam:violation_confirmed', (p) => handlers?.onViolationConfirmed?.(p));
  socket.on('exam:error', (p: { message?: string }) => {
    handlers?.onError?.(p?.message ?? 'Realtime error');
  });
  socket.on('connect_error', (err: Error) => {
    handlers?.onError?.(err.message || 'Realtime connect failed');
  });

  return socket;
}

export function startExamRealtime(opts: {
  baseUrl: string;
  token: string;
  examId: string;
  forcePolling?: boolean;
}): Promise<void> {
  const { baseUrl, token, examId, forcePolling } = opts;

  return new Promise((resolve, reject) => {
    const socket: Socket = io(baseUrl, {
      path: '/socket.io',
      auth: { token },
      transports: forcePolling ? ['polling'] : ['websocket', 'polling'],
    });

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      socket.close();
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Start exam timeout'));
    }, 8000);

    socket.on('connect', () => {
      socket.emit('exam:join', { examId });
    });

    socket.on('exam:joined', () => {
      socket.emit('exam:start', { examId });
    });

    socket.on('exam:started', (payload: { examId?: string }) => {
      if (payload?.examId !== examId) return;
      cleanup();
      resolve();
    });

    socket.on('exam:error', (payload: { message?: string }) => {
      cleanup();
      reject(new Error(payload?.message || 'Start exam failed'));
    });

    socket.on('connect_error', (err: Error) => {
      cleanup();
      reject(err);
    });
  });
}

