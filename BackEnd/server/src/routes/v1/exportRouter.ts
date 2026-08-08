import { Router } from "express";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { roleMiddleware } from "~/middlewares/role.middleware";
import pool from "~/config/db";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "teacher"]));

interface ExamResultRow {
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  exam_title: string;
  class_name: string;
  score: number | null;
  max_points: number | null;
  percentage: number | null;
  correct_count: number | null;
  total_questions: number | null;
  status: string;
  submitted_at: string | null;
  graded_at: string | null;
  grading_status: string | null;
  teacher_comment: string | null;
}

function toCSV(rows: ExamResultRow[]): string {
  const headers = [
    "Student Name", "Email",
    "Exam Title", "Class", "Score", "Max Points", "Percentage (%)",
    "Correct", "Total Questions", "Status", "Submitted At",
    "Grading Status", "Teacher Comment",
  ];
  const headerLine = headers.join(",");

  const dataLines = rows.map(row => {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    return [
      escape(row.student_name),
      escape(row.student_email),
      escape(row.exam_title),
      escape(row.class_name),
      escape(row.score ?? ""),
      escape(row.max_points ?? ""),
      escape(row.percentage != null ? row.percentage.toFixed(1) : ""),
      escape(row.correct_count ?? ""),
      escape(row.total_questions ?? ""),
      escape(row.status),
      escape(row.submitted_at ? new Date(row.submitted_at).toLocaleString() : ""),
      escape(row.grading_status ?? ""),
      escape(row.teacher_comment ?? ""),
    ].join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}

/** Convert a full result rowset to an Excel-compatible 2D array */
function toExcelArray(rows: ExamResultRow[]): string[][] {
  const headers = [
    "Student Name", "Email",
    "Exam Title", "Class", "Score", "Max Points", "Percentage (%)",
    "Correct", "Total Questions", "Status", "Submitted At",
    "Grading Status", "Teacher Comment",
  ];
  const dataRows = rows.map(row => [
    String(row.student_name ?? ""),
    String(row.student_email ?? ""),
    String(row.exam_title ?? ""),
    String(row.class_name ?? ""),
    row.score != null ? String(row.score) : "",
    row.max_points != null ? String(row.max_points) : "",
    row.percentage != null ? row.percentage.toFixed(1) : "",
    row.correct_count != null ? String(row.correct_count) : "",
    row.total_questions != null ? String(row.total_questions) : "",
    String(row.status ?? ""),
    row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "",
    String(row.grading_status ?? ""),
    String(row.teacher_comment ?? ""),
  ]);
  return [headers, ...dataRows];
}

/**
 * Build a minimal XLSX XML workbook from a 2D string array.
 * Produces a file that Excel can open directly.
 */
function buildSimpleXlsx(sheets: { name: string; data: string[][] }[]): Buffer {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let sheetXml = "";
  for (const [si, sh] of sheets.entries()) {
    const rid = si + 1;
    const cols = sh.data[0]?.length ?? 0;
    const rows = sh.data.length;
    const rArr = Array.from({ length: rows }, (_, ri) => {
      const cells = Array.from({ length: cols }, (_, ci) => {
        const colLetter = String.fromCharCode(65 + ci);
        const ref = `${colLetter}${ri + 1}`;
        const v = sh.data[ri]?.[ci] ?? "";
        return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
      }).join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    }).join("");

    sheetXml += `<sheet name="${esc(sh.name)}" sheetId="${rid}" r:id="rId${rid}"/>`;
  }

  const wbXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;

  const allSheetXmls = sheets.map((sh, si) => {
    const cols = sh.data[0]?.length ?? 0;
    const rows = sh.data.length;
    const rArr = Array.from({ length: rows }, (_, ri) => {
      const cells = Array.from({ length: cols }, (_, ci) => {
        const colLetter = String.fromCharCode(65 + ci);
        const ref = `${colLetter}${ri + 1}`;
        const v = sh.data[ri]?.[ci] ?? "";
        return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
      }).join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rArr}</sheetData>
</worksheet>`;
  });

  // Minimal ZIP: [Content_Types].xml, _rels/.rels, xl/workbook.xml, xl/worksheets/sheet1.xml
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  // Simple concatenation without real ZIP — use JSZip-like approach via raw buffer
  // Instead, we'll output an .xlsb-like HTML spreadsheet that Excel opens
  // Fallback: output .xls HTML format which Excel also opens
  return Buffer.from(buildHtmlWorkbook(sheets), "utf8");
}

function buildHtmlWorkbook(sheets: { name: string; data: string[][] }[]): string {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"></head><body>`;
  for (const sh of sheets) {
    html += `<table>${sh.data.map(r => `<tr>${r.map(c => `<td>${c.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  html += `</body></html>`;
  return html;
}

// GET /v1/exports/exam-results?examId=&classId=&format=csv
router.get("/exam-results", async (req, res, next) => {
  try {
    const { exam_id, class_id, format = "csv" } = req.query;
    const params: unknown[] = [];
    let idx = 1;
    const conditions: string[] = [];

    if (exam_id) {
      conditions.push(`es.exam_id = $${idx++}`);
      params.push(exam_id);
    }
    if (class_id) {
      conditions.push(`e.class_id = $${idx++}`);
      params.push(class_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         es.id AS session_id,
         es.student_id,
         a.full_name AS student_name,
         a.email AS student_email,
         e.title AS exam_title,
         c.name AS class_name,
         es.score,
         es.max_points,
         CASE WHEN es.max_points > 0 AND es.score IS NOT NULL
              THEN (es.score / es.max_points * 100)
              ELSE NULL
         END AS percentage,
         (SELECT COUNT(*)::int FROM jsonb_array_text(es.graded_details->'correct_answers') AS ca
          WHERE ca::text = 'true') AS correct_count,
         (es.graded_details->'total_questions')::int AS total_questions,
         es.status,
         es.submitted_at,
         es.graded_details->>'graded_at' AS graded_at,
         es.grading_status,
         es.graded_details->>'teacher_comment' AS teacher_comment
       FROM exam_sessions es
       JOIN exams e ON e.id = es.exam_id
       JOIN classes c ON c.id = e.class_id
       JOIN accounts a ON a.id = es.student_id
       ${where}
       ORDER BY e.title, a.full_name`,
      params
    );

    const rows: ExamResultRow[] = result.rows;

    if (format === "csv") {
      const csv = toCSV(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="exam-results-${Date.now()}.csv"`);
      res.send("\uFEFF" + csv); // BOM for Excel UTF-8
      return;
    }

    if (format === "excel" || format === "xlsx") {
      const excelData = toExcelArray(rows);
      const html = buildHtmlWorkbook([{ name: "Results", data: excelData }]);
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="exam-results-${Date.now()}.xls"`);
      res.send(Buffer.from(html, "utf8"));
      return;
    }

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /v1/exports/exam-results/:examId/summary — summary stats only
router.get("/exam-results/:examId/summary", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted') AS total_submitted,
         COUNT(*) FILTER (WHERE status = 'active') AS total_active,
         COUNT(*) AS total_sessions,
         AVG(CASE WHEN max_points > 0 AND score IS NOT NULL
                  THEN score / max_points * 100 END) AS avg_percentage,
         MIN(CASE WHEN max_points > 0 AND score IS NOT NULL
                  THEN score / max_points * 100 END) AS min_percentage,
         MAX(CASE WHEN max_points > 0 AND score IS NOT NULL
                  THEN score / max_points * 100 END) AS max_percentage,
         AVG(score) AS avg_score,
         COUNT(*) FILTER (WHERE grading_status = 'pending_manual') AS pending_grading
       FROM exam_sessions
       WHERE exam_id = $1`,
      [req.params.examId]
    );

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        total_sessions: Number(row.total_sessions),
        total_submitted: Number(row.total_submitted),
        total_active: Number(row.total_active),
        avg_percentage: row.avg_percentage ? Number(row.avg_percentage) : null,
        min_percentage: row.min_percentage ? Number(row.min_percentage) : null,
        max_percentage: row.max_percentage ? Number(row.max_percentage) : null,
        avg_score: row.avg_score ? Number(row.avg_score) : null,
        pending_grading: Number(row.pending_grading),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;