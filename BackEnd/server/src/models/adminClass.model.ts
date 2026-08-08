import pool from "~/config/db";

export interface AdminClass {
  id: string;
  program_id: string | null;
  program_code: string;
  intake_year: number;
  section: string;
  display_name: string;
  manager_teacher_id: string | null;
  expected_size: number;
  created_at: string;
}

export interface AdminClassDetail extends AdminClass {
  program_name?: string | null;
  manager_name: string | null;
  manager_email: string | null;
  student_count: number;
}

const DETAIL_SELECT = `
  SELECT ac.*,
         p.name AS program_name,
         m.full_name AS manager_name,
         m.email AS manager_email,
         (SELECT COUNT(*)::int FROM accounts s
          WHERE s.admin_class_id = ac.id AND s.role = 'student') AS student_count
  FROM admin_classes ac
  LEFT JOIN programs p ON p.id = ac.program_id
  LEFT JOIN accounts m ON m.id = ac.manager_teacher_id
`;

export const countClassesByManager = async (teacherId: string): Promise<number> => {
  const r = await pool.query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM admin_classes WHERE manager_teacher_id = $1`,
    [teacherId]
  );
  return r.rows[0]?.c ?? 0;
};

export const getAllAdminClasses = async (): Promise<AdminClassDetail[]> => {
  const result = await pool.query(
    `${DETAIL_SELECT}
     ORDER BY ac.intake_year DESC, ac.section ASC, ac.display_name ASC`
  );
  return result.rows;
};

export const getAdminClassesByManager = async (
  teacherId: string
): Promise<AdminClassDetail[]> => {
  const result = await pool.query(
    `${DETAIL_SELECT}
     WHERE ac.manager_teacher_id = $1
     ORDER BY ac.display_name ASC`,
    [teacherId]
  );
  return result.rows;
};

export const getAdminClassById = async (id: string): Promise<AdminClassDetail | null> => {
  const result = await pool.query(`${DETAIL_SELECT} WHERE ac.id = $1`, [id]);
  return result.rows[0] ?? null;
};

/** @deprecated use getAdminClassesByManager */
export const getAdminClassByManager = async (
  teacherId: string
): Promise<AdminClassDetail | null> => {
  const rows = await getAdminClassesByManager(teacherId);
  return rows[0] ?? null;
};

export const getProgramCodeById = async (programId: string): Promise<string | null> => {
  const r = await pool.query<{ code: string }>(
    `SELECT code FROM programs WHERE id = $1`,
    [programId]
  );
  return r.rows[0]?.code ?? null;
};

export type CreateAdminClassInput = {
  program_id: string;
  intake_year: number;
  section: string;
  display_name: string;
  manager_teacher_id?: string | null;
  expected_size?: number;
};

export const createAdminClass = async (input: CreateAdminClassInput): Promise<AdminClassDetail> => {
  const programCode = await getProgramCodeById(input.program_id);
  if (!programCode) throw new Error("Không tìm thấy chuyên ngành");
  const result = await pool.query(
    `INSERT INTO admin_classes (program_id, program_code, intake_year, section, display_name, manager_teacher_id, expected_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.program_id,
      programCode,
      input.intake_year,
      input.section.trim(),
      input.display_name.trim(),
      input.manager_teacher_id ?? null,
      Math.max(0, input.expected_size ?? 0),
    ]
  );
  const created = await getAdminClassById(result.rows[0].id);
  if (!created) throw new Error("Không tạo được lớp");
  return created;
};

export type UpdateAdminClassInput = {
  display_name?: string;
  manager_teacher_id?: string | null;
  expected_size?: number;
  intake_year?: number;
  section?: string;
};

export const updateAdminClass = async (
  id: string,
  input: UpdateAdminClassInput
): Promise<AdminClassDetail | null> => {
  const fields: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;
  if (input.display_name !== undefined) {
    fields.push(`display_name = $${idx++}`);
    values.push(input.display_name.trim());
  }
  if (input.manager_teacher_id !== undefined) {
    fields.push(`manager_teacher_id = $${idx++}`);
    values.push(input.manager_teacher_id);
  }
  if (input.expected_size !== undefined) {
    fields.push(`expected_size = $${idx++}`);
    values.push(Math.max(0, input.expected_size));
  }
  if (input.intake_year !== undefined) {
    fields.push(`intake_year = $${idx++}`);
    values.push(input.intake_year);
  }
  if (input.section !== undefined) {
    fields.push(`section = $${idx++}`);
    values.push(input.section.trim());
  }
  if (fields.length === 0) return getAdminClassById(id);
  await pool.query(`UPDATE admin_classes SET ${fields.join(", ")} WHERE id = $1`, values);
  return getAdminClassById(id);
};

export const deleteAdminClass = async (id: string): Promise<boolean> => {
  const r = await pool.query(`DELETE FROM admin_classes WHERE id = $1`, [id]);
  return (r.rowCount ?? 0) > 0;
};

export const assignStudentsToClass = async (
  classId: string,
  studentIds: string[],
  allowTransfer: boolean
): Promise<{ assigned: number; skipped: { id: string; reason: string }[] }> => {
  const uniqueIds = [...new Set(studentIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { assigned: 0, skipped: [] };
  }

  const r = await pool.query<{ id: string; role: string; admin_class_id: string | null }>(
    `SELECT id, role, admin_class_id FROM accounts WHERE id = ANY($1::uuid[])`,
    [uniqueIds]
  );
  const byId = new Map(r.rows.map((row) => [row.id, row]));
  const skipped: { id: string; reason: string }[] = [];
  const toAssign: string[] = [];

  for (const sid of uniqueIds) {
    const row = byId.get(sid);
    if (!row || row.role !== "student") {
      skipped.push({ id: sid, reason: "Không phải sinh viên" });
      continue;
    }
    if (row.admin_class_id === classId) {
      skipped.push({ id: sid, reason: "Đã trong lớp này" });
      continue;
    }
    if (row.admin_class_id && row.admin_class_id !== classId && !allowTransfer) {
      skipped.push({ id: sid, reason: "Đang thuộc lớp khác" });
      continue;
    }
    toAssign.push(sid);
  }

  if (toAssign.length === 0) {
    return { assigned: 0, skipped };
  }

  const upd = await pool.query(
    `UPDATE accounts SET admin_class_id = $1, updated_at = NOW()
     WHERE id = ANY($2::uuid[]) AND role = 'student'`,
    [classId, toAssign]
  );

  return { assigned: upd.rowCount ?? 0, skipped };
};

export const removeStudentFromClass = async (
  classId: string,
  studentId: string
): Promise<boolean> => {
  const r = await pool.query(
    `UPDATE accounts SET admin_class_id = NULL, updated_at = NOW()
     WHERE id = $1 AND admin_class_id = $2 AND role = 'student'`,
    [studentId, classId]
  );
  return (r.rowCount ?? 0) > 0;
};

export const bulkRemoveStudentsFromClass = async (
  classId: string,
  studentIds: string[]
): Promise<{ removed: number; failed: { id: string; reason: string }[] }> => {
  const uniqueIds = [...new Set(studentIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { removed: 0, failed: [] };
  }
  const r = await pool.query<{ id: string }>(
    `UPDATE accounts SET admin_class_id = NULL, updated_at = NOW()
     WHERE admin_class_id = $1 AND role = 'student' AND id = ANY($2::uuid[])
     RETURNING id`,
    [classId, uniqueIds]
  );
  const removedIds = new Set(r.rows.map((row) => row.id));
  const failed = uniqueIds
    .filter((id) => !removedIds.has(id))
    .map((id) => ({ id, reason: "Không tìm thấy sinh viên trong lớp" }));
  return { removed: removedIds.size, failed };
};

export const queryUnassignedStudents = async (
  limit: number,
  offset: number,
  search?: string
): Promise<{ items: unknown[]; total: number }> => {
  const conditions = [`a.role = 'student'`, `a.admin_class_id IS NULL`];
  const values: unknown[] = [];
  let idx = 1;
  if (search?.trim()) {
    conditions.push(
      `(a.email ILIKE $${idx} OR a.username ILIKE $${idx} OR COALESCE(a.full_name,'') ILIKE $${idx})`
    );
    values.push(`%${search.trim()}%`);
    idx++;
  }
  const where = conditions.join(" AND ");
  const countR = await pool.query(
    `SELECT COUNT(*)::int AS total FROM accounts a WHERE ${where}`,
    values
  );
  const total = countR.rows[0]?.total ?? 0;
  const dataR = await pool.query(
    `SELECT a.id, a.email, a.username, a.full_name, a.is_active, a.created_at
     FROM accounts a WHERE ${where}
     ORDER BY a.full_name NULLS LAST, a.email
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return { items: dataR.rows, total };
};

export const queryStudentsByClass = async (
  classId: string,
  limit: number,
  offset: number,
  search?: string
): Promise<{ items: unknown[]; total: number }> => {
  const conditions = [`a.admin_class_id = $1`, `a.role = 'student'`];
  const values: unknown[] = [classId];
  let idx = 2;
  if (search?.trim()) {
    conditions.push(
      `(a.email ILIKE $${idx} OR a.username ILIKE $${idx} OR COALESCE(a.full_name,'') ILIKE $${idx})`
    );
    values.push(`%${search.trim()}%`);
    idx++;
  }
  const where = conditions.join(" AND ");
  const countR = await pool.query(
    `SELECT COUNT(*)::int AS total FROM accounts a WHERE ${where}`,
    values
  );
  const total = countR.rows[0]?.total ?? 0;
  const dataR = await pool.query(
    `SELECT a.id, a.email, a.username, a.full_name, a.is_active, a.created_at
     FROM accounts a WHERE ${where}
     ORDER BY a.full_name NULLS LAST, a.username
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return { items: dataR.rows, total };
};

export const findStudentByUsernameOrEmail = async (
  username?: string,
  email?: string
): Promise<{ id: string; username: string; email: string; full_name: string | null; admin_class_id: string | null } | null> => {
  const u = username?.trim();
  const e = email?.trim();
  if (!u && !e) return null;
  if (u && e) {
    const r = await pool.query(
      `SELECT id, username, email, full_name, admin_class_id FROM accounts
       WHERE role = 'student' AND (username = $1 OR email = $2) LIMIT 1`,
      [u, e]
    );
    return r.rows[0] ?? null;
  }
  const r = await pool.query(
    `SELECT id, username, email, full_name, admin_class_id FROM accounts
     WHERE role = 'student' AND (${u ? "username = $1" : "email = $1"}) LIMIT 1`,
    [u || e]
  );
  return r.rows[0] ?? null;
};

export const getStudentEmailsByAdminClass = async (adminClassId: string): Promise<string[]> => {
  const result = await pool.query<{ email: string }>(
    `SELECT email FROM accounts
     WHERE admin_class_id = $1 AND role = 'student' AND is_active = true AND email IS NOT NULL`,
    [adminClassId]
  );
  return result.rows.map((r) => r.email);
};

export const getStudentsByAdminClass = async (adminClassId: string) => {
  const result = await pool.query(
    `SELECT id, email, username, full_name, role, admin_class_id, created_at
     FROM accounts
     WHERE admin_class_id = $1 AND role = 'student' AND is_active = true
     ORDER BY full_name NULLS LAST, email`,
    [adminClassId]
  );
  return result.rows;
};

export const teacherManagesClass = async (
  teacherId: string,
  classId: string
): Promise<boolean> => {
  const r = await pool.query(
    `SELECT 1 FROM admin_classes WHERE id = $1 AND manager_teacher_id = $2`,
    [classId, teacherId]
  );
  return (r.rowCount ?? 0) > 0;
};
