/**
 * Smoke test Socket.IO POC (backend only).
 *
 *   set TOKEN=<JWT từ POST /v1/auth/login>
 *   set EXAM_ID=<uuid đề thi tùy chọn>
 *   node scripts/socket-smoke.js
 *
 * Windows PowerShell:
 *   $env:TOKEN="eyJ..."; $env:EXAM_ID="..."; node scripts/socket-smoke.js
 */
const { io } = require("socket.io-client");

const token = process.env.TOKEN;
const url = process.env.SOCKET_URL || "http://localhost:5000";
const examId = process.env.EXAM_ID || "00000000-0000-0000-0000-000000000001";
const forcePolling =
  process.env.SOCKET_FORCE_POLLING === "1" || process.env.SOCKET_FORCE_POLLING === "true";

if (!token) {
  console.error("Thiếu TOKEN. Lấy JWT sau khi login rồi: TOKEN=... node scripts/socket-smoke.js");
  process.exit(1);
}

const socket = io(url, {
  path: "/socket.io",
  auth: { token },
  transports: forcePolling ? ["polling"] : ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("[ok] connected", socket.id);
  socket.emit("exam:join", { examId });
  socket.emit("exam:ping");
});

socket.on("exam:welcome", (p) => console.log("[event] exam:welcome", p));
socket.on("exam:joined", (p) => console.log("[event] exam:joined", p));
socket.on("exam:server_time", (p) => {
  console.log("[event] exam:server_time", p);
  setTimeout(() => {
    socket.close();
    process.exit(0);
  }, 200);
});

socket.on("exam:alert", (p) => console.log("[event] exam:alert", p));
socket.on("exam:error", (p) => console.error("[event] exam:error", p));
socket.on("connect_error", (err) => {
  console.error("[err] connect_error", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("timeout");
  process.exit(1);
}, 15000);
