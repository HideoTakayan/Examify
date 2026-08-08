import { Server, Socket } from "socket.io";
import { verifyTokenPayload } from "~/services/auth.service";
import { bindSessionNotifyServer, userRoom } from "~/socket/sessionNotify";
import { getExamById } from "~/models/exam.model";
import { forceSubmitActiveSessionsByExamService } from "~/services/exam.service";
import { saveExamRuntimeStart, saveExamRuntimeEnd, restoreExamRuntimes, getRuntimeStateByExam } from "~/models/examRuntimeState.model";
import {
  upsertProctorPresence,
  touchProctorPresence,
  disconnectProctorPresence,
  insertProctorLog,
} from "~/models/examProctor.model";
import { createNotification, type NotificationType } from "~/models/userNotification.model";
import pool from "~/config/db";

type NotifyKind = "info" | "warning" | "exam";

function asNotificationType(kind: NotifyKind): NotificationType {
  if (kind === "warning") return "warning";
  return "info";
}

function readToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  if (auth && typeof auth.token === "string") return auth.token;
  const q = socket.handshake.query.token;
  if (typeof q === "string") return q;
  if (Array.isArray(q) && typeof q[0] === "string") return q[0];
  return null;
}

export function roomForExam(examId: string): string {
  return `exam:${examId}`;
}

export type ExamRuntimeState = {
  examId: string;
  startedAtMs: number;
  endsAtMs: number;
  durationMin: number;
  final15Timer?: NodeJS.Timeout;
  endTimer?: NodeJS.Timeout;
};

// Exported so server.ts can call restoreExamRuntimes at startup
export const examStateStore = new Map<string, ExamRuntimeState>();

// --- Proctoring presence tracking ---
type ProctorSession = {
  socketId: string;
  userId: string;
  role: string;
  joinedAt: number;
};

const proctoringPresence = new Map<string, ProctorSession[]>(); // examId -> sessions (in-memory, for Socket.IO broadcast)

function getPresenceCount(examId: string): number {
  return (proctoringPresence.get(examId) ?? []).length;
}
function addPresence(examId: string, session: ProctorSession): void {
  const list = proctoringPresence.get(examId) ?? [];
  if (!list.find(s => s.socketId === session.socketId)) {
    list.push(session);
    proctoringPresence.set(examId, list);
  }
}
function removePresence(examId: string, socketId: string): void {
  const list = proctoringPresence.get(examId) ?? [];
  proctoringPresence.set(examId, list.filter(s => s.socketId !== socketId));
}
function getProctoringPresence(examId: string): { total: number; teachers: number; admins: number; students: number } {
  const list = proctoringPresence.get(examId) ?? [];
  return {
    total: list.length,
    teachers: list.filter(s => s.role === 'teacher').length,
    admins: list.filter(s => s.role === 'admin').length,
    students: list.filter(s => s.role === 'student').length,
  };
}

// --- Notification helpers ---
async function notifyEnrolledStudents(
  examId: string,
  title: string,
  message: string,
  kind: NotifyKind = "info"
): Promise<void> {
  try {
    const r = await pool.query(
      `SELECT student_id FROM exam_sessions WHERE exam_id = $1`,
      [examId]
    );
    const studentIds = r.rows.map((row: any) => row.student_id as string);
    const notifType = asNotificationType(kind);
    await Promise.all(
      studentIds.map((uid) =>
        createNotification(uid, title, message, notifType).catch(console.error)
      )
    );
  } catch (e) {
    console.error("[socket] notifyEnrolledStudents failed:", e);
  }
}

async function notifyUser(userId: string, title: string, message: string, kind: NotifyKind = "info"): Promise<void> {
  try {
    await createNotification(userId, title, message, asNotificationType(kind));
  } catch (e) {
    console.error("[socket] notifyUser failed:", e);
  }
}
// ----------------------------------------

let ioInstance: Server | null = null;

function sanitizeDuration(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(300, Math.max(1, Math.floor(n)));
}

function clearExamTimers(state?: ExamRuntimeState): void {
  if (!state) return;
  if (state.final15Timer) clearTimeout(state.final15Timer);
  if (state.endTimer) clearTimeout(state.endTimer);
}

function emitExamState(io: Server, examId: string): void {
  const state = examStateStore.get(examId);
  if (!state) {
    io.to(roomForExam(examId)).emit("exam:state", {
      examId,
      status: "not_started",
    });
    return;
  }

  const now = Date.now();
  io.to(roomForExam(examId)).emit("exam:state", {
    examId,
    status: now >= state.endsAtMs ? "ended" : "started",
    startedAt: new Date(state.startedAtMs).toISOString(),
    endsAt: new Date(state.endsAtMs).toISOString(),
    durationMin: state.durationMin,
    serverNowMs: now,
  });
}

async function finalizeExamRuntime(io: Server, state: ExamRuntimeState): Promise<void> {
  const examId = state.examId;
  try {
    const summary = await forceSubmitActiveSessionsByExamService(examId);
    io.to(roomForExam(examId)).emit("exam:force_submit", {
      examId,
      message: "Hết giờ làm bài. Hệ thống đã tự động nộp bài trên server.",
      at: new Date().toISOString(),
      summary,
    });
    // Notify enrolled students that exam has ended
    await notifyEnrolledStudents(
      examId,
      "[Kết thúc] Bài thi đã kết thúc",
      "Bài thi đã kết thúc. Hệ thống đã tự động nộp bài.",
      "exam"
    );
  } catch (error) {
    console.error(`[socket] force-submit runtime failed exam=${examId}`, error);
    io.to(roomForExam(examId)).emit("exam:force_submit", {
      examId,
      message: "Hết giờ làm bài. Hệ thống yêu cầu nộp bài ngay.",
      at: new Date().toISOString(),
    });
  } finally {
    clearExamTimers(state);
    examStateStore.delete(examId);
    void saveExamRuntimeEnd(examId).catch(console.error);
  }
}

function startExamRuntime(
  io: Server,
  examId: string,
  durationMin: number,
  opts?: { fixedStartedAtMs?: number; fixedEndsAtMs?: number }
): ExamRuntimeState {
  const old = examStateStore.get(examId);
  clearExamTimers(old);

  const startedAtMs = opts?.fixedStartedAtMs ?? Date.now();
  const endsAtMs =
    opts?.fixedEndsAtMs != null &&
    Number.isFinite(opts.fixedEndsAtMs) &&
    opts.fixedEndsAtMs > startedAtMs
      ? opts.fixedEndsAtMs
      : startedAtMs + durationMin * 60_000;
  const effectiveDurationMin = Math.max(1, Math.ceil((endsAtMs - startedAtMs) / 60_000));
  const state: ExamRuntimeState = {
    examId,
    startedAtMs,
    endsAtMs,
    durationMin: effectiveDurationMin,
  };

  const msUntilFinal15 = Math.max(0, (effectiveDurationMin - 15) * 60_000);
  state.final15Timer = setTimeout(() => {
    io.to(roomForExam(examId)).emit("exam:final_15m", {
      examId,
      message: "Còn 15 phút để hoàn tất bài thi.",
      at: new Date().toISOString(),
    });
    void notifyEnrolledStudents(examId, "Còn 15 phút!", "Bài thi sắp kết thúc. Vui lòng hoàn thành ngay.", "warning");
  }, msUntilFinal15);

  const msUntilEnd = Math.max(0, endsAtMs - Date.now());
  state.endTimer = setTimeout(() => {
    void finalizeExamRuntime(io, state);
  }, msUntilEnd);

  examStateStore.set(examId, state);
  void saveExamRuntimeStart(examId, new Date(startedAtMs), new Date(endsAtMs), effectiveDurationMin).catch(console.error);
  emitExamState(io, examId);
  return state;
}

/**
 * POC Socket.IO cho thi online: JWT handshake, join room theo đề, ping thời gian server,
 * giám thị broadcast cảnh báo vào room (chỉ admin/teacher).
 */
export function registerExamSocket(io: Server): void {
  ioInstance = io;
  bindSessionNotifyServer(io);
  io.use(async (socket, next) => {
    const token = readToken(socket);
    if (!token) {
      return next(new Error("Unauthorized: thiếu token (handshake.auth.token hoặc query.token)"));
    }
    try {
      const payload = await verifyTokenPayload(token);
      if (payload.first_login && payload.role !== "admin") {
        return next(
          new Error("PASSWORD_CHANGE_REQUIRED: Bạn phải đổi mật khẩu trước khi thi")
        );
      }
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unauthorized: token không hợp lệ";
      next(new Error(msg));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;
    const ipAddress = socket.handshake.address;
    const userAgent = socket.handshake.headers["user-agent"] ?? undefined;
    console.log(`[socket] connect id=${socket.id} user=${userId} role=${role} ip=${ipAddress}`);

    void socket.join(userRoom(userId));

    socket.emit("exam:welcome", {
      socketId: socket.id,
      hint:
        "POC: emit exam:join { examId }, exam:ping | GV: exam:proctor_alert { examId, message }",
    });

    // ---- Student: join exam room ----
    socket.on("exam:join", async (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId || typeof examId !== "string") {
        socket.emit("exam:error", { code: "BAD_EXAM_ID", message: "examId (string) bắt buộc" });
        return;
      }
      const room = roomForExam(examId);
      void socket.join(room);
      socket.emit("exam:joined", { examId, room });

      // Persist presence in DB (student join)
      if (role === "student") {
        await upsertProctorPresence({
          examId,
          studentId: userId,
          socketId: socket.id,
          ipAddress,
          userAgent,
        }).catch((err) => console.error("[socket] upsertProctorPresence failed:", err));

        // Log ip_address_change event if student already had a recorded IP
        await insertProctorLog({
          examId,
          studentId: userId,
          eventType: "ip_address_change",
          ipAddress,
          userAgent,
          metadata: { socketId: socket.id },
        }).catch((err) => console.error("[socket] insertProctorLog failed:", err));
      }

      emitExamState(io, examId);

      // Broadcast updated presence to room
      io.to(room).emit("proctor:presence_update", {
        examId,
        ...getProctoringPresence(examId),
      });

      console.log(`[socket] ${socket.id} -> ${room}`);
    });

    // ---- Student: leave exam room ----
    socket.on("exam:leave", async (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId) return;
      void socket.leave(roomForExam(examId));

      if (role === "student") {
        await disconnectProctorPresence(examId, socket.id).catch((err) =>
          console.error("[socket] disconnectProctorPresence failed:", err)
        );
      }

      removePresence(examId, socket.id);
      io.to(roomForExam(examId)).emit("proctor:presence_update", {
        examId,
        ...getProctoringPresence(examId),
      });
      socket.emit("exam:left", { examId });
    });

    // ---- Proctor (teacher/admin): join monitoring room ----
    socket.on("proctor:join", (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId || typeof examId !== "string") {
        socket.emit("exam:error", { code: "BAD_EXAM_ID", message: "examId (string) bắt buộc" });
        return;
      }
      if (role !== "admin" && role !== "teacher") {
        socket.emit("exam:error", { code: "FORBIDDEN", message: "Chỉ admin hoặc teacher" });
        return;
      }
      const room = roomForExam(examId);
      void socket.join(room);
      addPresence(examId, { socketId: socket.id, userId, role, joinedAt: Date.now() });
      io.to(room).emit("proctor:presence_update", {
        examId,
        ...getProctoringPresence(examId),
      });
      socket.emit("proctor:joined", { examId, room });
      console.log(`[proctor] ${socket.id} (${role}) joined monitoring room ${room}`);
    });

    socket.on("proctor:leave", (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId) return;
      void socket.leave(roomForExam(examId));
      removePresence(examId, socket.id);
      io.to(roomForExam(examId)).emit("proctor:presence_update", {
        examId,
        ...getProctoringPresence(examId),
      });
      socket.emit("proctor:left", { examId });
    });

    socket.on("proctor:request_presence", (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId) return;
      socket.emit("proctor:presence_update", {
        examId,
        ...getProctoringPresence(examId),
      });
    });

    // ---- Proctor: ping to keep presence alive ----
    socket.on("proctor:ping", async (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId || role !== "student") return;
      await touchProctorPresence(examId, userId).catch((err) =>
        console.error("[socket] touchProctorPresence failed:", err)
      );
    });

    // ---- Proctor: advanced proctor event (screenshot, etc.) ----
    socket.on(
      "proctor:log_event",
      async (payload: {
        examId?: string;
        eventType?: string;
        screenshotUrl?: string;
        metadata?: Record<string, unknown>;
      }) => {
        const examId = payload?.examId;
        const eventType = payload?.eventType;
        if (!examId || !eventType) {
          socket.emit("exam:error", { code: "BAD_PAYLOAD", message: "examId và eventType bắt buộc" });
          return;
        }

        await insertProctorLog({
          examId,
          studentId: userId,
          eventType: eventType as Parameters<typeof insertProctorLog>[0]["eventType"],
          screenshotUrl: payload.screenshotUrl ?? null,
          ipAddress,
          userAgent,
          metadata: payload.metadata ?? undefined,
        }).catch((err) => console.error("[socket] insertProctorLog failed:", err));
      }
    );

    // ---- Broadcast cảnh báo theo nhóm ----
    socket.on("proctor:broadcast_group", (payload: {
      examId?: string;
      group?: string;
      message?: string;
    }) => {
      if (role !== "admin" && role !== "teacher") {
        socket.emit("exam:error", { code: "FORBIDDEN", message: "Chỉ admin hoặc teacher" });
        return;
      }
      const examId = payload?.examId;
      const group = payload?.group;
      const message = payload?.message;
      if (!examId || !message?.trim()) {
        socket.emit("exam:error", { code: "BAD_PAYLOAD", message: "examId và message bắt buộc" });
        return;
      }
      if (!['all', 'violators', 'active'].includes(group ?? '')) {
        socket.emit("exam:error", { code: "BAD_GROUP", message: "group phải là 'all' | 'violators' | 'active'" });
        return;
      }
      const room = roomForExam(examId);
      const alertPayload = {
        examId,
        message: message.trim(),
        fromRole: role,
        at: new Date().toISOString(),
      };
      io.to(room).emit("exam:alert", alertPayload);
      io.to(room).emit("proctor:group_alert", {
        examId,
        group: group!,
        message: message.trim(),
        fromRole: role,
        fromUserId: userId,
        at: new Date().toISOString(),
      });
      socket.emit("proctor:broadcast_sent", { examId, group, recipients: group });
    });

    socket.on("exam:ping", () => {
      const serverNowMs = Date.now();
      socket.emit("exam:server_time", {
        serverNowMs,
        iso: new Date(serverNowMs).toISOString(),
      });
    });

    socket.on(
      "exam:proctor_alert",
      async (payload: { examId?: string; message?: string }) => {
        if (role !== "admin" && role !== "teacher") {
          socket.emit("exam:error", { code: "FORBIDDEN", message: "Chỉ admin hoặc teacher" });
          return;
        }
        const examId = payload?.examId;
        const message = payload?.message;
        if (!examId || typeof message !== "string" || !message.trim()) {
          socket.emit("exam:error", {
            code: "BAD_PAYLOAD",
            message: "examId và message (string) bắt buộc",
          });
          return;
        }
        const room = roomForExam(examId);
        io.to(room).emit("exam:alert", {
          examId,
          message: message.trim(),
          fromRole: role,
          at: new Date().toISOString(),
        });
        // Save in-app notification for all enrolled students
        await notifyEnrolledStudents(
          examId,
          "[Cảnh báo] Giám thị gửi thông báo",
          message.trim(),
          "warning"
        );
        socket.emit("exam:alert_sent", { examId, room });
      }
    );

    socket.on(
      "exam:start",
      async (payload: { examId?: string }) => {
        if (role !== "admin" && role !== "teacher") {
          socket.emit("exam:error", { code: "FORBIDDEN", message: "Chỉ admin hoặc teacher" });
          return;
        }
        const examId = payload?.examId;
        if (!examId || typeof examId !== "string") {
          socket.emit("exam:error", { code: "BAD_EXAM_ID", message: "examId (string) bắt buộc" });
          return;
        }
        const exam = await getExamById(examId);
        if (!exam) {
          socket.emit("exam:error", { code: "NOT_FOUND", message: "Không tìm thấy bài thi" });
          return;
        }
        const durationMin = sanitizeDuration(exam.duration_min);
        const state = startExamRuntime(io, examId, durationMin);
        io.to(roomForExam(examId)).emit("exam:started", {
          examId,
          startedAt: new Date(state.startedAtMs).toISOString(),
          endsAt: new Date(state.endsAtMs).toISOString(),
          durationMin: state.durationMin,
          byRole: role,
        });
        // Notify enrolled students that exam has started
        await notifyEnrolledStudents(
          examId,
          "[Bắt đầu] Bài thi đã được bắt đầu",
          `Bài thi "${exam.title}" đã bắt đầu. Vui lòng làm bài ngay.`,
          "exam"
        );
      }
    );

    socket.on("disconnect", async (reason) => {
      console.log(`[socket] disconnect id=${socket.id} reason=${reason}`);
      // Clean up presence from all rooms this socket was in
      for (const [examId, list] of proctoringPresence.entries()) {
        const idx = list.findIndex(s => s.socketId === socket.id);
        if (idx !== -1) {
          list.splice(idx, 1);
          proctoringPresence.set(examId, list);
          if (ioInstance) {
            ioInstance.to(roomForExam(examId)).emit("proctor:presence_update", {
              examId,
              ...getProctoringPresence(examId),
            });
          }
        }
      }
      // Disconnect student from DB presence
      for (const [examId, list] of proctoringPresence.entries()) {
        // For each exam, check if this socketId was a student
        const session = list.find(s => s.socketId === socket.id && s.role === "student");
        if (session) {
          await disconnectProctorPresence(examId, socket.id).catch((err) =>
            console.error("[socket] disconnectProctorPresence on disconnect failed:", err)
          );
        }
      }
    });
  });
}

export function emitForceSubmitNotification(examId: string, summary: {
  exam_id: string;
  active_sessions: number;
  submitted_sessions: number;
  failed_sessions: number;
}): void {
  if (!ioInstance) return;
  ioInstance.to(roomForExam(examId)).emit("exam:force_submit", {
    examId,
    message: "Giảng viên đã force-submit. Hệ thống đã nộp bài trên server.",
    at: new Date().toISOString(),
    summary,
  });
  // Notify in-app notification (fire-and-forget)
  notifyEnrolledStudents(
    examId,
    "[Thông báo] Giáo viên đã yêu cầu nộp bài",
    "Giáo viên đã yêu cầu nộp bài. Bài thi của bạn đã được nộp.",
    "exam"
  ).catch(console.error);
}

// P0 Fix: Emit violation confirmed event to client and proctors
export function emitViolationConfirmed(sessionId: string, data: {
  acknowledged: boolean;
  violation_id: string;
  session_status: string;
  auto_submit_triggered: boolean;
  message: string;
}): void {
  if (!ioInstance) return;
  // Emit to all sockets (client will filter by sessionId)
  // In production, you'd want to emit to specific user socket
  ioInstance.emit("exam:violation_confirmed", {
    sessionId,
    violationId: data.violation_id,
    sessionStatus: data.session_status,
    autoSubmitTriggered: data.auto_submit_triggered,
    message: data.message,
    at: new Date().toISOString(),
  });
}

/** Báo giám thị trong room exam có integrity event mới — dashboard refresh dữ liệu. */
export function emitProctoringIntegrityUpdate(
  examId: string,
  meta?: { session_id?: string; student_id?: string; accepted?: number }
): void {
  if (!ioInstance) return;
  ioInstance.to(roomForExam(examId)).emit("proctor:integrity_update", {
    examId,
    session_id: meta?.session_id ?? null,
    student_id: meta?.student_id ?? null,
    accepted: meta?.accepted ?? 0,
    at: new Date().toISOString(),
  });
}

export type ExamRuntimeStartMode = "manual" | "scheduled";

export async function startExamRuntimeFromServer(
  examId: string,
  mode: ExamRuntimeStartMode = "manual"
): Promise<{
  examId: string;
  startedAt: string;
  endsAt: string;
  durationMin: number;
  mode: ExamRuntimeStartMode;
}> {
  if (!ioInstance) {
    throw new Error("Socket.IO server is not ready");
  }

  const exam = await getExamById(examId);
  if (!exam) {
    throw new Error("Không tìm thấy bài thi");
  }

  const durationMin = sanitizeDuration(exam.duration_min);
  const nowMs = Date.now();

  let state: ExamRuntimeState;

  if (mode === "scheduled") {
    if (!exam.opens_at || !exam.ends_at) {
      throw new Error("Bài thi chưa đặt lịch opens_at/ends_at");
    }
    const opensMs = new Date(exam.opens_at).getTime();
    const endsMs = new Date(exam.ends_at).getTime();
    if (!Number.isFinite(opensMs) || !Number.isFinite(endsMs) || opensMs >= endsMs) {
      throw new Error("Lịch thi không hợp lệ");
    }
    if (endsMs <= nowMs) {
      throw new Error("Bài thi đã hết giờ kết thúc");
    }
    const windowMin = Math.max(1, Math.ceil((endsMs - opensMs) / 60_000));
    state = startExamRuntime(ioInstance, examId, windowMin, {
      fixedStartedAtMs: opensMs,
      fixedEndsAtMs: endsMs,
    });
  } else {
    const endAt = exam.ends_at ? new Date(exam.ends_at).getTime() : null;
    if (endAt != null && Number.isFinite(endAt) && endAt <= nowMs) {
      throw new Error("Bài thi đã hết giờ kết thúc");
    }
    state = startExamRuntime(ioInstance, examId, durationMin);
  }

  console.log(
    `[exam-runtime] started exam=${examId} mode=${mode} duration=${state.durationMin}m endsAt=${new Date(state.endsAtMs).toISOString()}`
  );
  const payload = {
    examId,
    startedAt: new Date(state.startedAtMs).toISOString(),
    endsAt: new Date(state.endsAtMs).toISOString(),
    durationMin: state.durationMin,
    mode,
  };

  ioInstance.to(roomForExam(examId)).emit("exam:started", {
    ...payload,
    byRole: "server",
  });

  return payload;
}

/** Force-submit and end runtime (scheduled end or manual cleanup). */
export async function finalizeExamRuntimeByExamId(examId: string): Promise<void> {
  if (!ioInstance) {
    throw new Error("Socket.IO server is not ready");
  }
  const state = examStateStore.get(examId);
  if (state) {
    await finalizeExamRuntime(ioInstance, state);
    return;
  }
  const { getRuntimeStateByExam } = await import("~/models/examRuntimeState.model");
  const dbState = await getRuntimeStateByExam(examId);
  if (dbState?.is_active) {
    const synthetic: ExamRuntimeState = {
      examId,
      startedAtMs: new Date(dbState.started_at).getTime(),
      endsAtMs: new Date(dbState.ends_at).getTime(),
      durationMin: dbState.duration_min,
    };
    await finalizeExamRuntime(ioInstance, synthetic);
  }
}

/** Called by server.ts on startup to restore active exam runtimes from DB */
export async function restoreExamRuntimesOnStartup(io: Server): Promise<void> {
  await restoreExamRuntimes(io, examStateStore);
}