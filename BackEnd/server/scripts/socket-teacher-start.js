/**
 * Teacher/Admin bat dau bai thi realtime:
 *   $env:TOKEN="<jwt_teacher>"; $env:EXAM_ID="<uuid>"; $env:DURATION_MIN="20"; npm run socket:teacher-start
 */
const { io } = require("socket.io-client");

const token = process.env.TOKEN;
const url = process.env.SOCKET_URL || "http://localhost:5000";
const examId = process.env.EXAM_ID || "00000000-0000-0000-0000-000000000001";
const durationMin = Number(process.env.DURATION_MIN || "20");

if (!token) {
  console.error("Thieu TOKEN (teacher/admin).");
  process.exit(1);
}

const socket = io(url, {
  path: "/socket.io",
  auth: { token },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("[ok] connected", socket.id);
  socket.emit("exam:join", { examId });
  socket.emit("exam:start", { examId, durationMin });
});

socket.on("exam:started", (p) => {
  console.log("[event] exam:started", p);
  setTimeout(() => {
    socket.close();
    process.exit(0);
  }, 300);
});

socket.on("exam:error", (p) => {
  console.error("[event] exam:error", p);
  process.exit(1);
});

socket.on("connect_error", (err) => {
  console.error("[err] connect_error", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("timeout");
  process.exit(1);
}, 15000);

