/**
 * Smoke test cho kiến trúc 3 tầng dự đoán điểm.
 * Lấy 1 sinh viên thật trong dataset, "che" 1 môn target,
 * dùng Tầng 1 để dự đoán môn đó, rồi Tầng 2 để sinh nhận xét.
 *
 * Chạy: npx ts-node -r tsconfig-paths/register scripts/smoke-grade-predictor.ts
 */

import fs from "node:fs";
import path from "node:path";
import { predictGrade } from "../src/services/gradePredictor.service";
import {
  evaluateStudent,
  summaryFromPrediction,
} from "../src/services/aiEvaluator.service";

interface Student {
  student_id: string;
  name: string;
  scores: Record<string, number>;
}

async function main() {
  const gradesPath = path.resolve(__dirname, "../../../cntt1602_grades.json");
  const data = JSON.parse(fs.readFileSync(gradesPath, "utf-8")) as {
    students: Student[];
  };

  const target = "S52"; // Kiểm thử phần mềm
  // Lấy SV thứ 3 (Nguyễn Ánh Cương — GPA cao) để test cả strong_groups
  const candidates = data.students.filter(
    (s) => typeof s.scores[target] === "number" && s.scores[target] > 0
  );
  const student = candidates[2] ?? candidates[0];
  if (!student) throw new Error("Không tìm thấy SV phù hợp");

  const actualScore = student.scores[target];
  const scoresMasked = { ...student.scores };
  delete scoresMasked[target]; // che môn target để không leak

  const gpa =
    Object.values(scoresMasked)
      .filter((v) => v > 0)
      .reduce((a, b) => a + b, 0) /
    Object.values(scoresMasked).filter((v) => v > 0).length;

  console.log("══════════════════════════════════════════════════════════");
  console.log(`SV: ${student.name} (${student.student_id})`);
  console.log(`Môn target: ${target} | Điểm thực: ${actualScore}/10 | GPA: ${gpa.toFixed(2)}`);
  console.log("══════════════════════════════════════════════════════════\n");

  // ----- TẦNG 1 -----
  console.log("▶ TẦNG 1 — Predict bằng math (KHÔNG gọi AI):");
  const t0 = Date.now();
  const prediction = predictGrade({
    gpa,
    scores: scoresMasked,
    subject_id: target,
  });
  const t1ms = Date.now() - t0;
  console.log(JSON.stringify(prediction, null, 2));
  console.log(
    `\nTầng 1 chạy trong ${t1ms} ms | Sai số: ${(
      prediction.predicted_score - actualScore
    ).toFixed(2)}đ\n`
  );

  // ----- TẦNG 2 -----
  console.log("▶ TẦNG 2 — AI nhận xét (compressed prompt):");
  const summary = summaryFromPrediction(prediction, gpa, actualScore);
  console.log("Input gửi cho AI (compressed):");
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    `→ Kích thước: ${JSON.stringify(summary).length} bytes (~${Math.ceil(
      JSON.stringify(summary).length / 4
    )} tokens)\n`
  );

  const t2start = Date.now();
  const evaluation = await evaluateStudent(summary);
  const t2ms = Date.now() - t2start;
  console.log("Output AI:");
  console.log(JSON.stringify(evaluation, null, 2));
  console.log(`\nTầng 2 chạy trong ${t2ms} ms\n`);

  console.log("══════════════════════════════════════════════════════════");
  console.log("✓ Smoke test PASSED");
  console.log("══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("✗ Smoke test FAILED:", err);
  process.exit(1);
});
