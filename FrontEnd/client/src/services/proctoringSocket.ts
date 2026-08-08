import { io, type Socket } from 'socket.io-client';

export type PresencePayload = {
  examId: string;
  total: number;
  teachers: number;
  admins: number;
  students: number;
};

export type GroupAlertPayload = {
  examId: string;
  group: 'all' | 'violators' | 'active';
  message: string;
  fromRole: string;
  fromUserId: string;
  at: string;
};

export type IntegrityUpdatePayload = {
  examId: string;
  session_id: string | null;
  student_id: string | null;
  accepted: number;
  at: string;
};

type ProctoringHandlers = {
  onPresenceUpdate?: (payload: PresencePayload) => void;
  onGroupAlert?: (payload: GroupAlertPayload) => void;
  onIntegrityUpdate?: (payload: IntegrityUpdatePayload) => void;
  onProctorJoined?: (payload: { examId: string; room: string }) => void;
  onProctorLeft?: (payload: { examId: string }) => void;
  onBroadcastSent?: (payload: { examId: string; group: string }) => void;
  onError?: (message: string) => void;
  onDisconnect?: () => void;
  onReconnecting?: () => void;
  onConnect?: () => void;
};

export function createProctoringSocket(opts: {
  baseUrl: string;
  token: string;
  examId: string;
  forcePolling?: boolean;
  handlers?: ProctoringHandlers;
}): Socket {
  const { baseUrl, token, examId, forcePolling, handlers } = opts;
  const socket: Socket = io(baseUrl, {
    path: '/socket.io',
    auth: { token },
    transports: forcePolling ? ['polling'] : ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    handlers?.onConnect?.();
    socket.emit('proctor:join', { examId });
  });

  socket.on('proctor:presence_update', (p: PresencePayload) => {
    handlers?.onPresenceUpdate?.(p);
  });

  socket.on('proctor:group_alert', (p: GroupAlertPayload) => {
    handlers?.onGroupAlert?.(p);
  });

  socket.on('proctor:integrity_update', (p: IntegrityUpdatePayload) => {
    handlers?.onIntegrityUpdate?.(p);
  });

  socket.on('proctor:joined', (p: { examId: string; room: string }) => {
    handlers?.onProctorJoined?.(p);
  });

  socket.on('proctor:left', (p: { examId: string }) => {
    handlers?.onProctorLeft?.(p);
  });

  socket.on('proctor:broadcast_sent', (p: { examId: string; group: string }) => {
    handlers?.onBroadcastSent?.(p);
  });

  socket.on('exam:error', (p: { message?: string }) => {
    handlers?.onError?.(p?.message ?? 'Proctoring socket error');
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

  return socket;
}

export function requestPresence(socket: Socket, examId: string): void {
  socket.emit('proctor:request_presence', { examId });
}

export function sendGroupBroadcast(
  socket: Socket,
  examId: string,
  group: 'all' | 'violators' | 'active',
  message: string
): void {
  socket.emit('proctor:broadcast_group', { examId, group, message });
}

export function leaveProctoring(socket: Socket, examId: string): void {
  socket.emit('proctor:leave', { examId });
}