/**
 * Giả lập giám thị / GV: gui exam:proctor_alert vao room (can token admin hoac teacher).
 *
 * PowerShell (chay SAU khi da mo socket-student, cung EXAM_ID):
 *   $env:TOKEN="<jwt_teacher>"; $env:EXAM_ID="00000000-0000-0000-0000-000000000001"; $env:ALERT_MSG="Het 5 phut!"; npm run socket:proctor
 */
const { io } = require("socket.io-client");

const token = process.env.TOKEN;
const url = process.env.SOCKET_URL || "http://localhost:5000";
const examId = process.env.EXAM_ID || "00000000-0000-0000-0000-000000000001";
const message = process.env.ALERT_MSG || "POC: canh bao tu giam thi";

if (!token) {
  console.error("Thiếu TOKEN (JWT teacher hoặc admin).");
  process.exit(1);
}

const socket = io(url, {
  path: "/socket.io",
  auth: { token },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("[ok] connected", socket.id);
  socket.emit("exam:proctor_alert", { examId, message });
});

socket.on("exam:alert_sent", (p) => {
  console.log("[ok] da gui:", p);
  setTimeout(() => {
    socket.close();
    process.exit(0);
  }, 300);
});

socket.on("exam:error", (p) => {
  console.error("[loi]", p);
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
