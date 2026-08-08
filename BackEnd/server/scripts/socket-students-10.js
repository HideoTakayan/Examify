/**
 * Gia lap 10 hoc vien cung vao phong thi.
 *
 * Cach 1 (don gian): 1 TOKEN duoc dung cho 10 ket noi
 *   $env:TOKEN="<jwt_student>"; $env:EXAM_ID="<uuid>"; npm run socket:students-10
 *
 * Cach 2: danh sach TOKEN (10 token hoac it hon)
 *   $env:TOKENS="<jwt1>,<jwt2>,..."; $env:EXAM_ID="<uuid>"; npm run socket:students-10
 */
const { io } = require("socket.io-client");

const url = process.env.SOCKET_URL || "http://localhost:5000";
const examId = process.env.EXAM_ID || "00000000-0000-0000-0000-000000000001";
const rawTokens = process.env.TOKENS || process.env.TOKEN || "";
const baseTokens = rawTokens
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!baseTokens.length) {
  console.error("Thieu TOKEN hoac TOKENS.");
  process.exit(1);
}

const tokens = Array.from({ length: 10 }, (_, i) => baseTokens[i % baseTokens.length]);
const sockets = [];

for (let i = 0; i < 10; i += 1) {
  const socket = io(url, {
    path: "/socket.io",
    auth: { token: tokens[i] },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log(`[s${i + 1}] connected ${socket.id}`);
    socket.emit("exam:join", { examId });
  });
  socket.on("exam:joined", () => console.log(`[s${i + 1}] joined ${examId}`));
  socket.on("exam:state", (p) => console.log(`[s${i + 1}] state=${p.status}`));
  socket.on("exam:started", (p) => console.log(`[s${i + 1}] started endsAt=${p.endsAt}`));
  socket.on("exam:final_15m", (p) => console.log(`[s${i + 1}] final15=${p.message}`));
  socket.on("exam:force_submit", (p) => console.log(`[s${i + 1}] force_submit=${p.message}`));
  socket.on("exam:error", (p) => console.log(`[s${i + 1}] error`, p));
  socket.on("connect_error", (err) => console.log(`[s${i + 1}] connect_error ${err.message}`));
  sockets.push(socket);
}

console.log("Dang giu 10 ket noi. Nhan Ctrl+C de thoat.");

process.on("SIGINT", () => {
  sockets.forEach((s) => s.close());
  process.exit(0);
});

