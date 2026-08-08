import type { Server } from "socket.io";

let io: Server | null = null;

export function bindSessionNotifyServer(server: Server): void {
  io = server;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Báo cho mọi tab/socket đang mở của user — đăng xuất ngay khi login ở nơi khác. */
export function notifySessionRevoked(userId: string): void {
  if (!io) return;
  io.to(userRoom(userId)).emit("auth:session_revoked", {
    message: "Session đã hết hạn hoặc bị thu hồi từ thiết bị khác",
  });
}
