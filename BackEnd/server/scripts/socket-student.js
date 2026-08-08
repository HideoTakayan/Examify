/**
 * Giả lập thí sinh: join phòng thi, ping giờ server, GIỮ kết nối để nhận exam:alert.
 *
 * PowerShell (cùng EXAM_ID với lệnh proctor):
 *   $env:TOKEN="<jwt_student>"; $env:EXAM_ID="00000000-0000-0000-0000-000000000001"; npm run socket:student
 *
 * Production:
 *   $env:SOCKET_URL="https://api.exam.local"; ...
 */
const { io } = require("socket.io-client");

const token = process.env.TOKEN;
const url = process.env.SOCKET_URL || "http://localhost:5000";
const examId = process.env.EXAM_ID || "00000000-0000-0000-0000-000000000001";

if (!token) {
  console.error("Thiếu TOKEN (JWT student).");
  process.exit(1);
}

const socket = io(url, {
  path: "/socket.io",
  auth: { token },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("[ok] da ket noi", socket.id);
  socket.emit("exam:join", { examId });
  socket.emit("exam:ping");
});

socket.on("exam:welcome", (p) => console.log("[event] exam:welcome", JSON.stringify(p)));
socket.on("exam:joined", (p) => console.log("[event] exam:joined", JSON.stringify(p)));
socket.on("exam:server_time", (p) => console.log("[event] exam:server_time", JSON.stringify(p)));
socket.on("exam:alert", (p) => console.log("\n>>> NHAN CANH BAO:", JSON.stringify(p, null, 2)));
socket.on("exam:error", (p) => console.error("[event] exam:error", p));
socket.on("connect_error", (err) => {
  console.error("[err] connect_error", err.message);
  process.exit(1);
});
socket.on("disconnect", (r) => console.log("[info] disconnect", r));

console.log("Dang cho exam:alert... (Ctrl+C de thoat)\n");

process.on("SIGINT", () => {
  socket.close();
  process.exit(0);
});
