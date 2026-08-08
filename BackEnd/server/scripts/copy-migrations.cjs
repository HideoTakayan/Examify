const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../src/db/migrations");
const dest = path.join(__dirname, "../dist/db/migrations");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[build] copied migrations -> ${dest}`);

// Copy model_weights.json (Tầng 0 output) sang dist để runtime đọc được
const dataSrc = path.join(__dirname, "../src/data");
const dataDest = path.join(__dirname, "../dist/data");
if (fs.existsSync(dataSrc)) {
  fs.mkdirSync(dataDest, { recursive: true });
  fs.cpSync(dataSrc, dataDest, { recursive: true });
  console.log(`[build] copied data -> ${dataDest}`);
}
