import { Request, Response, NextFunction } from "express";
import pool from "~/config/db";
import bcrypt from "bcrypt";
import { getAdminClassByManager, teacherManagesClass } from "~/models/adminClass.model";
import { parsePaginationQuery, buildPaginatedList } from "~/utils/pagination";
import { isEmailConfigured, sendEmail } from "~/services/email.service";
import { buildTranscriptCourses, calcCumulativeGpa } from "~/utils/gradeScale";

interface StudentRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

const STUDENT_RETURN_COLS =
  "id, email, username, full_name, is_active, created_at::text";

async function getTeacherAdminClassId(
  userId: string,
  preferredClassId?: string
): Promise<string | null> {
  if (preferredClassId && (await teacherManagesClass(userId, preferredClassId))) {
    return preferredClassId;
  }
  const ac = await getAdminClassByManager(userId);
  return ac?.id ?? null;
}

/** Giáo viên: lớp được gán; Admin: truyền admin_class_id trên query. */
async function resolveAdminClassIdForGrades(req: Request): Promise<string | null> {
  const user = (req as { user?: { role?: string; userId?: string } }).user;
  if (user?.role === "admin") {
    const id = (req.query.admin_class_id as string | undefined)?.trim();
    return id || null;
  }
  if (user?.role === "teacher" && user.userId) {
    const q = (req.query.admin_class_id as string | undefined)?.trim();
    return getTeacherAdminClassId(user.userId, q);
  }
  return null;
}

export const listStudentsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const subjectId = (req.query.subject_id as string)?.trim();

    if (!subjectId) {
      // Logic cũ cho admin_class_id nếu không phải ngữ cảnh môn học
      const adminClassId = await getTeacherAdminClassId(
        user.userId,
        (req.query.admin_class_id as string | undefined)?.trim()
      );
      if (!adminClassId) {
        return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
      }

      const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
      const search = (req.query.search as string)?.trim();

      let where = `WHERE a.admin_class_id = $1 AND a.role = 'student'`;
      const params: unknown[] = [adminClassId];
      let idx = 2;
      if (search) {
        where += ` AND (a.full_name ILIKE $${idx} OR a.email ILIKE $${idx} OR a.username ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }

      const countR = await pool.query(`SELECT COUNT(*)::int AS total FROM accounts a ${where}`, params);
      const total = countR.rows[0]?.total ?? 0;

      const dataR = await pool.query<StudentRow>(
        `SELECT a.id, a.email, a.username, a.full_name, a.is_active, a.created_at::text
         FROM accounts a ${where}
         ORDER BY a.full_name NULLS LAST, a.email
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );

      return res.json({ success: true, data: buildPaginatedList(dataR.rows, total, limit, offset) });
    }

    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const search = (req.query.search as string)?.trim();

    // Tìm sinh viên học các lớp (sections) của môn này do giáo viên dạy trong kỳ hiện tại
    let where = `WHERE a.role = 'student' 
      AND a.id IN (
        SELECT tse.student_id 
        FROM term_student_enrollments tse
        JOIN term_subject_offerings tso ON tso.id = tse.term_offering_id
        JOIN semesters sem ON sem.id = tso.semester_id
        JOIN term_teacher_registrations ttr ON ttr.term_offering_id = tso.id
        WHERE ttr.teacher_id = $1 AND tso.subject_id = $2 AND sem.is_current = true
      )`;
    const values: unknown[] = [user.userId, subjectId];
    let idx = 3;

    if (search) {
      where += ` AND (a.username ILIKE $${idx} OR a.email ILIKE $${idx} OR a.full_name ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM accounts a ${where}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query<StudentRow>(
      `SELECT ${STUDENT_RETURN_COLS}
       FROM accounts a
       ${where}
       ORDER BY a.username ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return res.json({ success: true, data: buildPaginatedList(dataRes.rows, total, limit, offset) });
  } catch (err) {
    next(err);
  }
};

export const addStudentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(
      user.userId,
      (req.query.admin_class_id as string | undefined)?.trim()
    );
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { full_name, username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "username, email, password là bắt buộc" });
    }

    const dup = await pool.query(
      `SELECT id FROM accounts WHERE email = $1 OR username = $2 LIMIT 1`,
      [email, username]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Email hoặc username đã tồn tại" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const r = await pool.query<StudentRow>(
      `INSERT INTO accounts (email, username, hashed_password, role, full_name, admin_class_id, first_login)
       VALUES ($1, $2, $3, 'student', $4, $5, true)
       RETURNING ${STUDENT_RETURN_COLS}`,
      [email, username, hashed, full_name ?? null, adminClassId]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
};

export const updateStudentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(
      user.userId,
      (req.query.admin_class_id as string | undefined)?.trim()
    );
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { id } = req.params;
    const existing = await pool.query(
      `SELECT id FROM accounts WHERE id = $1 AND admin_class_id = $2 AND role = 'student'`,
      [id, adminClassId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: "Sinh viên không tồn tại trong lớp" });
    }

    const { full_name, username, email, is_active } = req.body;

    if (username !== undefined || email !== undefined) {
      const dup = await pool.query(
        `SELECT id FROM accounts
         WHERE id <> $1 AND (($2::text IS NOT NULL AND email = $2) OR ($3::text IS NOT NULL AND username = $3))
         LIMIT 1`,
        [id, email ?? null, username ?? null]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: "Email hoặc mã SV đã tồn tại" });
      }
    }

    const sets: string[] = [];
    const vals: unknown[] = [id];
    let i = 2;
    if (full_name !== undefined) { sets.push(`full_name = $${i++}`); vals.push(full_name); }
    if (username !== undefined) { sets.push(`username = $${i++}`); vals.push(username); }
    if (email !== undefined) { sets.push(`email = $${i++}`); vals.push(email); }
    if (is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(is_active); }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: "Không có gì để cập nhật" });
    }

    const r = await pool.query<StudentRow>(
      `UPDATE accounts SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $1 RETURNING ${STUDENT_RETURN_COLS}`,
      vals
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
};

export const deleteStudentController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(
      user.userId,
      (req.query.admin_class_id as string | undefined)?.trim()
    );
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { id } = req.params;
    const r = await pool.query(
      `DELETE FROM accounts WHERE id = $1 AND admin_class_id = $2 AND role = 'student'`,
      [id, adminClassId]
    );
    if ((r.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: "Sinh viên không tồn tại trong lớp" });
    }
    res.json({ success: true, message: "Đã xóa sinh viên" });
  } catch (err) { next(err); }
};

interface GradeRow {
  student_id: string;
  full_name: string | null;
  username: string;
  email: string;
  exam_id: string | null;
  exam_title: string | null;
  session_id: string | null;
  version_code: string | null;
  score: number | null;
  max_points: number | null;
  submitted_at: string | null;
  status: string | null;
  grading_status: string | null;
}

interface GradedDetailParsed {
  question_id: string;
  question_type: string;
  is_correct: boolean;
  points_earned: number | null;
  max_points: number;
  pending_grading?: boolean;
}

function parseGradedDetails(raw: unknown): GradedDetailParsed[] {
  if (raw == null) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(arr) ? (arr as GradedDetailParsed[]) : [];
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function toAsciiFilenameBase(value: string, fallback: string): string {
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\r\n"]/g, " ")
    .replace(/[^a-zA-Z0-9._ -]/g, " ")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);

  return ascii || fallback;
}

function encodeRfc5987Value(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function setContentDispositionHeader(
  res: Response,
  disposition: "attachment" | "inline",
  filenameBase: string,
  extension: string,
  fallbackBase: string
) {
  const safeExt = extension.replace(/[^a-zA-Z0-9]/g, "") || "dat";
  const cleanedBase = filenameBase.replace(/[\r\n]/g, " ").trim() || fallbackBase;
  const fallbackFilename = `${toAsciiFilenameBase(cleanedBase, fallbackBase)}.${safeExt}`;
  const utf8Filename = `${cleanedBase}.${safeExt}`;

  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${fallbackFilename}"; filename*=UTF-8''${encodeRfc5987Value(utf8Filename)}`
  );
}

async function getClassName(adminClassId: string): Promise<string> {
  const classR = await pool.query(
    `SELECT display_name FROM admin_classes WHERE id = $1`,
    [adminClassId]
  );
  return classR.rows[0]?.display_name ?? "";
}

/** Danh sách bài thi của lớp (để chọn khi xem bảng điểm). */
export const getGradeReportExamsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminClassId = await resolveAdminClassIdForGrades(req);
    if (!adminClassId) {
      return res.status(400).json({
        success: false,
        message: "Chọn lớp hành chính (admin_class_id) để xem bảng điểm",
      });
    }

    const r = await pool.query<{
      id: string;
      title: string;
      submitted_count: number;
    }>(
      `
      SELECT
        e.id,
        e.title,
        COUNT(es.id) FILTER (WHERE es.status = 'submitted')::int AS submitted_count
      FROM exams e
      LEFT JOIN exam_sessions es ON es.exam_id = e.id
      WHERE e.admin_class_id = $1
      GROUP BY e.id, e.title
      ORDER BY e.title
      `,
      [adminClassId]
    );

    res.json({
      success: true,
      data: {
        class_name: await getClassName(adminClassId),
        exams: r.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Bảng điểm: có exam_id → 1 dòng/SV; không có → chỉ phiên đã nộp. */
export const getGradeReportController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminClassId = await resolveAdminClassIdForGrades(req);
    if (!adminClassId) {
      return res.status(400).json({
        success: false,
        message: "Chọn lớp hành chính (admin_class_id) để xem bảng điểm",
      });
    }

    const examId = (req.query.exam_id as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const { limit, offset } = parsePaginationQuery(req.query as Record<string, unknown>);
    const class_name = await getClassName(adminClassId);

    if (examId) {
      const examCheck = await pool.query(
        `SELECT id, title FROM exams WHERE id = $1 AND admin_class_id = $2`,
        [examId, adminClassId]
      );
      if (!examCheck.rows[0]) {
        return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
      }

      let studentWhere = `a.admin_class_id = $1 AND a.role = 'student'`;
      const filterParams: unknown[] = [adminClassId];
      let paramIdx = 2;
      if (search) {
        studentWhere += ` AND (a.full_name ILIKE $${paramIdx} OR a.email ILIKE $${paramIdx} OR a.username ILIKE $${paramIdx})`;
        filterParams.push(`%${search}%`);
        paramIdx++;
      }
      const examParamIdx = paramIdx;
      filterParams.push(examId);
      paramIdx++;
      const limitParamIdx = paramIdx;
      filterParams.push(limit);
      paramIdx++;
      const offsetParamIdx = paramIdx;
      filterParams.push(offset);

      const statsR = await pool.query<{ class_total: number; submitted: number }>(
        `
        SELECT
          COUNT(*)::int AS class_total,
          COUNT(es.id)::int AS submitted
        FROM accounts a
        LEFT JOIN exam_sessions es
          ON es.student_id = a.id AND es.exam_id = $2 AND es.status = 'submitted'
        WHERE a.admin_class_id = $1 AND a.role = 'student'
        `,
        [adminClassId, examId]
      );
      const stats = statsR.rows[0] ?? { class_total: 0, submitted: 0 };

      const countR = await pool.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM accounts a WHERE ${studentWhere}`,
        filterParams.slice(0, search ? 2 : 1)
      );
      const total = countR.rows[0]?.total ?? 0;

      const dataR = await pool.query<GradeRow>(
        `
        SELECT
          a.id AS student_id,
          a.full_name,
          a.username,
          a.email,
          e.id AS exam_id,
          e.title AS exam_title,
          es.id::text AS session_id,
          es.version_code,
          es.score,
          es.max_points,
          es.submitted_at::text,
          es.status,
          es.grading_status
        FROM accounts a
        LEFT JOIN exam_sessions es
          ON es.student_id = a.id AND es.exam_id = $${examParamIdx} AND es.status = 'submitted' AND es.voided_at IS NULL
        LEFT JOIN exams e ON e.id = $${examParamIdx}
        WHERE ${studentWhere}
        ORDER BY a.full_name NULLS LAST, a.username
        LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
        `,
        filterParams
      );

      return res.json({
        success: true,
        data: {
          class_name,
          exam_id: examId,
          submitted_count: stats.submitted,
          class_student_total: stats.class_total,
          ...buildPaginatedList(dataR.rows, total, limit, offset),
        },
      });
    }

    let sessionWhere = `a.admin_class_id = $1 AND a.role = 'student' AND es.status = 'submitted' AND e.admin_class_id = $1`;
    const sessionParams: unknown[] = [adminClassId];
    if (search) {
      sessionWhere += ` AND (a.full_name ILIKE $2 OR a.email ILIKE $2 OR a.username ILIKE $2)`;
      sessionParams.push(`%${search}%`);
    }

    const countR = await pool.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM exam_sessions es
      JOIN accounts a ON a.id = es.student_id
      JOIN exams e ON e.id = es.exam_id
      WHERE ${sessionWhere}
      `,
      sessionParams
    );
    const total = countR.rows[0]?.total ?? 0;

    const limitIdx = sessionParams.length + 1;
    const offsetIdx = sessionParams.length + 2;
    const dataR = await pool.query<GradeRow>(
      `
      SELECT
        a.id AS student_id,
        a.full_name,
        a.username,
        a.email,
        e.id AS exam_id,
        e.title AS exam_title,
        es.id::text AS session_id,
        es.version_code,
        es.score,
        es.max_points,
        es.submitted_at::text,
        es.status,
        es.grading_status
      FROM exam_sessions es
      JOIN accounts a ON a.id = es.student_id
      JOIN exams e ON e.id = es.exam_id
      WHERE ${sessionWhere}
      ORDER BY e.title, a.full_name NULLS LAST, a.username
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      [...sessionParams, limit, offset]
    );

    res.json({
      success: true,
      data: {
        class_name,
        exam_id: null,
        submitted_count: total,
        class_student_total: total,
        ...buildPaginatedList(dataR.rows, total, limit, offset),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Xuất CSV chi tiết: STT, Họ tên, Mã SV, từng câu (Đ/S + Điểm). */
export const exportGradeReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminClassId = await resolveAdminClassIdForGrades(req);
    if (!adminClassId) {
      return res.status(400).json({
        success: false,
        message: "Chọn lớp hành chính (admin_class_id) để xuất bảng điểm",
      });
    }

    const examId = (req.query.exam_id as string | undefined)?.trim();
    if (!examId) {
      return res.status(400).json({ success: false, message: "exam_id là bắt buộc" });
    }

    const examR = await pool.query<{ title: string }>(
      `SELECT title FROM exams WHERE id = $1 AND admin_class_id = $2`,
      [examId, adminClassId]
    );
    if (!examR.rows[0]) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài thi" });
    }
    const examTitle = examR.rows[0].title;
    const className = await getClassName(adminClassId);

    const studentsR = await pool.query<{
      id: string;
      username: string;
      full_name: string | null;
    }>(
      `SELECT id, username, full_name FROM accounts
       WHERE admin_class_id = $1 AND role = 'student'
       ORDER BY full_name NULLS LAST, username`,
      [adminClassId]
    );

    const sessionsR = await pool.query<{
      student_id: string;
      session_id: string;
      version_code: string | null;
      score: number | null;
      max_points: number | null;
      graded_details: unknown;
    }>(
      `SELECT student_id, id::text AS session_id, version_code, score, max_points, graded_details
       FROM exam_sessions
       WHERE exam_id = $1 AND status = 'submitted'`,
      [examId]
    );

    const sessionByStudent = new Map(sessionsR.rows.map((s) => [s.student_id, s]));

    const questionsR = await pool.query<{
      id: string;
      display_order: number;
      version_index: number;
    }>(
      `SELECT id, display_order, version_index FROM questions
       WHERE exam_id = $1 ORDER BY version_index, display_order`,
      [examId]
    );

    const questionsByVersion = new Map<number, { id: string; order: number }[]>();
    for (const q of questionsR.rows) {
      const v = q.version_index ?? 0;
      if (!questionsByVersion.has(v)) questionsByVersion.set(v, []);
      questionsByVersion.get(v)!.push({ id: q.id, order: q.display_order });
    }

    let maxQ = 0;
    for (const list of questionsByVersion.values()) {
      maxQ = Math.max(maxQ, list.length);
    }
    if (maxQ === 0) maxQ = 50;

    const header1 = ["STT", "Họ tên", "Mã SV", "Mã đề", "Tổng điểm", "Thang", "%"];
    for (let i = 1; i <= maxQ; i++) {
      header1.push(String(i), "");
    }

    const header2 = ["", "", "", "", "", "", ""];
    for (let i = 1; i <= maxQ; i++) {
      header2.push("Đ/S", "Điểm");
    }

    const dataRows: string[][] = [];
    let stt = 0;
    for (const stu of studentsR.rows) {
      stt += 1;
      const sess = sessionByStudent.get(stu.id);
      const row: string[] = [
        String(stt),
        stu.full_name ?? "",
        stu.username,
        sess?.version_code ?? "",
        sess?.score != null ? String(sess.score) : "",
        sess?.max_points != null ? String(sess.max_points) : "",
        sess?.score != null && sess?.max_points && sess.max_points > 0
          ? ((sess.score / sess.max_points) * 100).toFixed(1)
          : "",
      ];

      const details = parseGradedDetails(sess?.graded_details);
      const detailMap = new Map(details.map((d) => [d.question_id, d]));

      let qList = questionsByVersion.get(0) ?? [];
      if (sess?.version_code) {
        const vMatch = /^D(\d+)$/i.exec(sess.version_code);
        if (vMatch) {
          const vIdx = Number(vMatch[1]) - 1;
          qList = questionsByVersion.get(vIdx) ?? qList;
        }
      }

      for (let i = 0; i < maxQ; i++) {
        const q = qList[i];
        if (!q || !sess) {
          row.push("", "");
          continue;
        }
        const d = detailMap.get(q.id);
        if (!d) {
          row.push("", "");
          continue;
        }
        if (d.question_type === "essay" || d.pending_grading) {
          row.push("TL", d.points_earned != null ? String(d.points_earned) : "");
        } else {
          row.push(d.is_correct ? "Đ" : "S", d.points_earned != null ? String(d.points_earned) : "0");
        }
      }
      dataRows.push(row);
    }

    const titleRow = [
      `BẢNG ĐIỂM CHI TIẾT — ${examTitle} — ${className}`,
      ...Array(header1.length - 1).fill(""),
    ];
    const lines = [
      titleRow.map(csvEscape).join(","),
      header1.map(csvEscape).join(","),
      header2.map(csvEscape).join(","),
      ...dataRows.map((r) => r.map(csvEscape).join(",")),
    ];
    const csv = "\uFEFF" + lines.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    setContentDispositionHeader(
      res,
      "attachment",
      `bang_diem_chi_tiet_${examTitle}`,
      "csv",
      "bang_diem_chi_tiet"
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const sendGradeReportEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Email chưa cấu hình (cần MAIL_FROM + SMTP hoặc RESEND_API_KEY)",
      });
    }

    const user = (req as any).user;
    const adminClassId = await getTeacherAdminClassId(
      user.userId,
      (req.query.admin_class_id as string | undefined)?.trim()
    );
    if (!adminClassId) {
      return res.status(403).json({ success: false, message: "Chưa được gán lớp quản lý" });
    }

    const { student_ids } = req.body as { student_ids?: string[] };

    let studentFilter = `a.admin_class_id = $1 AND a.role = 'student'`;
    const params: unknown[] = [adminClassId];
    if (student_ids?.length) {
      studentFilter += ` AND a.id = ANY($2::uuid[])`;
      params.push(student_ids);
    }

    const stuR = await pool.query<{
      id: string;
      email: string;
      full_name: string | null;
    }>(
      `SELECT a.id, a.email, a.full_name FROM accounts a WHERE ${studentFilter}`,
      params
    );

    const classR = await pool.query(
      `SELECT display_name FROM admin_classes WHERE id = $1`,
      [adminClassId]
    );
    const className = classR.rows[0]?.display_name ?? "";

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let lastError = "";

    for (const stu of stuR.rows) {
      try {
        const payload = await loadStudentTranscriptPayload(stu.id, adminClassId);
        if (!payload) {
          skippedCount++;
          continue;
        }

        const html = buildTranscriptHtml(payload);
        const studentName = payload.student.full_name;
        const subject = `[Bảng kết quả học tập] ${studentName} — ${className}`;
        const textLines = payload.courses.map(
          (c, i) =>
            `${i + 1}. ${c.subject_name}: ${c.grade10.toFixed(1)} (10), ${c.grade4.toFixed(1)} (4), ${c.letter}`
        );
        const text =
          `Bảng kết quả học tập — ${studentName}\n` +
          `Lớp: ${payload.student.class_name}\n\n` +
          (textLines.length ? `${textLines.join("\n")}\n\n` : "Chưa có học phần đã hoàn thành.\n\n") +
          `GPA (4): ${payload.summary.gpa4.toFixed(2)} | GPA (10): ${payload.summary.gpa10.toFixed(2)} | TC: ${payload.summary.totalCredits}\n` +
          `Xếp loại: ${payload.summary.classification}`;

        await sendEmail(stu.email, subject, html, text);
        sentCount++;
      } catch (err) {
        failedCount++;
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[grade-email] Failed for ${stu.email}:`, lastError);
      }
    }

    if (sentCount === 0 && failedCount > 0) {
      const needsDomain =
        /verify domain|chưa verify domain|only send testing emails/i.test(lastError);
      return res.status(needsDomain ? 403 : 502).json({
        success: false,
        message: lastError || "Không gửi được email",
        data: { sent: 0, total: stuR.rows.length, failed: failedCount, skipped: skippedCount },
      });
    }

    res.json({
      success: true,
      data: {
        sent: sentCount,
        total: stuR.rows.length,
        failed: failedCount,
        skipped: skippedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

async function loadStudentTranscriptPayload(studentId: string, adminClassId: string) {
  const stuR = await pool.query<{
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    class_name: string | null;
    program_code: string | null;
    intake_year: number | null;
    section: string | null;
  }>(
    `
    SELECT a.id, a.username, a.email, a.full_name,
           ac.display_name AS class_name, ac.program_code, ac.intake_year, ac.section
    FROM accounts a
    LEFT JOIN admin_classes ac ON ac.id = a.admin_class_id
    WHERE a.id = $1 AND a.admin_class_id = $2 AND a.role = 'student'
    `,
    [studentId, adminClassId]
  );
  if (!stuR.rows[0]) return null;

  const coursesR = await pool.query<{
    subject_name: string | null;
    subject_code: string | null;
    credits: number | null;
    exam_title: string;
    score: number | null;
    max_points: number | null;
    submitted_at: string | null;
  }>(
    `
    SELECT DISTINCT ON (COALESCE(e.subject_id::text, e.id::text))
      COALESCE(s.name, e.title) AS subject_name,
      s.code AS subject_code,
      COALESCE(s.credits, 3) AS credits,
      e.title AS exam_title,
      es.score,
      es.max_points,
      es.submitted_at::text
    FROM exam_sessions es
    JOIN exams e ON e.id = es.exam_id
    LEFT JOIN subjects s ON s.id = e.subject_id
    WHERE es.student_id = $1 AND es.status = 'submitted'
      AND es.voided_at IS NULL
      AND (
        e.admin_class_id = (SELECT admin_class_id FROM accounts WHERE id = $1)
        OR e.class_id IN (
          SELECT term_offering_id FROM term_student_enrollments WHERE student_id = $1
        )
        OR e.class_id IN (
          SELECT class_id FROM enrollments WHERE student_id = $1
        )
      )
    ORDER BY COALESCE(e.subject_id::text, e.id::text), es.submitted_at DESC
    `,
    [studentId]
  );

  const courses = buildTranscriptCourses(coursesR.rows);
  const summary = calcCumulativeGpa(courses);
  const stu = stuR.rows[0];

  return {
    student: {
      id: stu.id,
      student_code: stu.username,
      full_name: stu.full_name ?? stu.username,
      email: stu.email,
      class_name: stu.class_name ?? "",
      program_code: stu.program_code ?? "CNTT",
      intake_year: stu.intake_year ?? 16,
      section: stu.section ?? "",
      major: "Công nghệ thông tin",
      training_system: "Đại học",
    },
    courses,
    summary,
    issued_at: new Date().toISOString(),
  };
}

async function resolveAdminClassIdForTranscript(
  req: Request,
  studentId: string
): Promise<string | null> {
  const user = (req as { user?: { role?: string; userId?: string } }).user;
  if (user?.role === "admin") {
    const r = await pool.query<{ admin_class_id: string | null }>(
      `SELECT admin_class_id FROM accounts WHERE id = $1 AND role = 'student'`,
      [studentId]
    );
    return r.rows[0]?.admin_class_id ?? null;
  }
  if (user?.role === "teacher" && user.userId) {
    const q = (req.query.admin_class_id as string | undefined)?.trim();
    return getTeacherAdminClassId(user.userId, q);
  }
  return null;
}

export const getStudentTranscriptController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminClassId = await resolveAdminClassIdForTranscript(req, req.params.id);
    if (!adminClassId) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên hoặc chưa gán lớp" });
    }
    const data = await loadStudentTranscriptPayload(req.params.id, adminClassId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

function buildTranscriptHtml(
  payload: NonNullable<Awaited<ReturnType<typeof loadStudentTranscriptPayload>>>
): string {
  const { student, courses, summary } = payload;
  const courseRows = courses
    .map(
      (c, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="l">${c.subject_name}</td>
      <td class="c">${c.credits}</td>
      <td class="c">${c.grade10.toFixed(1)}</td>
      <td class="c">${c.grade4.toFixed(1)}</td>
      <td class="c">${c.letter}</td>
    </tr>`
    )
    .join("");

  const issued = new Date().toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/>
<title>Bảng điểm - ${student.full_name}</title>
<style>
  body{font-family:"Times New Roman",serif;font-size:13px;margin:24px;color:#111}
  h1{font-size:16px;text-align:center;margin:4px 0}
  h2{font-size:14px;text-align:center;margin:8px 0 16px;font-weight:bold}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:16px;font-size:13px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #333;padding:5px 8px}
  th{background:#f0f0f0;font-weight:bold;text-align:center}
  td.c{text-align:center}
  td.l{text-align:left}
  .sum{margin-top:12px;font-size:13px;line-height:1.6}
  .foot{margin-top:24px;text-align:right;font-style:italic}
  @media print{body{margin:12mm}}
</style></head><body>
<p style="text-align:center;font-weight:bold">TRƯỜNG YOUR UNIVERSITY</p>
<h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
<p style="text-align:center;font-size:12px">Độc lập - Tự do - Hạnh phúc</p>
<h2>BẢNG KẾT QUẢ HỌC TẬP (BẢNG ĐIỂM)</h2>
<div class="meta">
  <div><b>Họ và tên:</b> ${student.full_name}</div>
  <div><b>Mã số SV:</b> ${student.student_code}</div>
  <div><b>Lớp:</b> ${student.class_name}</div>
  <div><b>Khóa:</b> ${student.intake_year}</div>
  <div><b>Ngành học:</b> ${student.major}</div>
  <div><b>Hệ đào tạo:</b> ${student.training_system}</div>
</div>
<table>
<thead><tr>
<th>TT</th><th>Tên học phần</th><th>TC</th><th>Hệ 10</th><th>Hệ 4</th><th>Điểm chữ</th>
</tr></thead>
<tbody>${courseRows || '<tr><td colspan="6" class="c">Chưa có học phần đã hoàn thành</td></tr>'}</tbody>
</table>
<div class="sum">
<p><b>Điểm TBC tích lũy (thang 4):</b> ${summary.gpa4.toFixed(2)}</p>
<p><b>Điểm TBC học tập (thang 10):</b> ${summary.gpa10.toFixed(2)}</p>
<p><b>Số tín chỉ tích lũy:</b> ${summary.totalCredits}</p>
<p><b>Xếp loại học tập:</b> ${summary.classification}</p>
</div>
<p class="foot">Hà Nội, ${issued}</p>
</body></html>`;
}

export const exportStudentTranscriptController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminClassId = await resolveAdminClassIdForTranscript(req, req.params.id);
    if (!adminClassId) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên hoặc chưa gán lớp" });
    }
    const format = (req.query.format as string) || "html";
    const payload = await loadStudentTranscriptPayload(req.params.id, adminClassId);
    if (!payload) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sinh viên" });
    }

    if (format === "csv") {
      const header = ["TT", "Tên học phần", "TC", "Hệ 10", "Hệ 4", "Điểm chữ"];
      const lines = [
        [`BẢNG KẾT QUẢ HỌC TẬP — ${payload.student.full_name}`, ...Array(5).fill("")].map(csvEscape).join(","),
        header.map(csvEscape).join(","),
        ...payload.courses.map((c, i) =>
          [String(i + 1), c.subject_name, String(c.credits), c.grade10.toFixed(1), c.grade4.toFixed(1), c.letter]
            .map(csvEscape)
            .join(",")
        ),
        ["", "", "", "", "", ""].join(","),
        [`GPA (4): ${payload.summary.gpa4}`, `GPA (10): ${payload.summary.gpa10}`, `TC: ${payload.summary.totalCredits}`, `XL: ${payload.summary.classification}`, "", ""]
          .map(csvEscape)
          .join(","),
      ];
      const csv = "\uFEFF" + lines.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      setContentDispositionHeader(
        res,
        "attachment",
        `bang_diem_${payload.student.student_code}`,
        "csv",
        "bang_diem"
      );
      return res.send(csv);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    setContentDispositionHeader(
      res,
      "inline",
      `bang_diem_${payload.student.student_code}`,
      "html",
      "bang_diem"
    );
    res.send(buildTranscriptHtml(payload));
  } catch (err) {
    next(err);
  }
};



