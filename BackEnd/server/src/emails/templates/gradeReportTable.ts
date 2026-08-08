import { escapeHtml } from "../layout";
import type { EmailContent } from "../types";
import { formatScoreScale10Pair, scoreToPointPercent } from "~/utils/gradeScale";

export type GradeReportRow = {
  exam_title: string;
  score: number | null;
  max_points: number | null;
  submitted_at: string | null;
};

export type GradeReportTableParams = {
  className: string;
  studentName: string;
  rows: GradeReportRow[];
};

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

/** GV gửi bảng điểm tổng hợp cho một sinh viên. */
export function buildGradeReportTableEmail(params: GradeReportTableParams): EmailContent {
  const className = escapeHtml(params.className);
  const studentName = escapeHtml(params.studentName);
  const subject = `[Bảng điểm] ${params.className}`;

  const tableRows = params.rows
    .map((g) => {
      const pctVal = scoreToPointPercent(g.score, g.max_points);
      const pct = pctVal != null ? `${pctVal}%` : "—";
      return `<tr>
        <td>${escapeHtml(g.exam_title)}</td>
        <td>${formatScoreScale10Pair(g.score, g.max_points)}</td>
        <td>${pct}</td>
        <td>${formatSubmittedDate(g.submitted_at)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
    .c{background:#fff;border-radius:8px;padding:30px;max-width:700px;margin:auto}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px}
    th{background:#2563eb;color:#fff}
    .footer{margin-top:24px;font-size:12px;color:#888}
  </style>
</head>
<body>
  <div class="c">
    <h2>Bảng điểm — ${className}</h2>
    <p>Xin chào <b>${studentName}</b>,</p>
    <p>Dưới đây là bảng điểm các bài thi đã nộp của bạn:</p>
    <table>
      <thead>
        <tr><th>Bài thi</th><th>Điểm (thang 10)</th><th>% điểm</th><th>Ngày nộp</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p class="footer">Email được gửi tự động từ hệ thống thi trực tuyến.</p>
  </div>
</body>
</html>`;

  const textLines = params.rows.map((g) => {
    const pctVal = scoreToPointPercent(g.score, g.max_points);
    const pct = pctVal != null ? `${pctVal}%` : "—";
    return `- ${g.exam_title}: ${formatScoreScale10Pair(g.score, g.max_points)} (${pct}), nộp ${formatSubmittedDate(g.submitted_at)}`;
  });

  const text =
    `Bảng điểm — ${params.className}\n\n` +
    `Xin chào ${params.studentName},\n\n` +
    `${textLines.join("\n")}\n\n` +
    `Email được gửi tự động từ hệ thống thi trực tuyến.`;

  return { subject, html, text };
}
