import pool from "~/config/db";

export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  email: string;
  username: string;
  hashed_password: string;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  first_login: boolean;
  token_version: number;
  admin_class_id?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<User, "hashed_password"> & {
  password_plain?: string | null;
  homeroom_teacher_name?: string | null;
  homeroom_teacher_email?: string | null;
  admin_class_name?: string | null;
  managed_class_names?: string | null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE username = $1",
    [username]
  );
  return result.rows[0] ?? null;
};

/** Một query tra cứu nhiều username/email — dùng cho import Excel preview/confirm. */
export const findAccountsByUsernamesOrEmails = async (
  usernames: string[],
  emails: string[]
): Promise<User[]> => {
  const uList = [...new Set(usernames.map((s) => s.trim()).filter(Boolean))];
  const eList = [...new Set(emails.map((s) => s.trim()).filter(Boolean))];
  if (uList.length === 0 && eList.length === 0) return [];
  const result = await pool.query(
    `SELECT * FROM accounts
     WHERE (cardinality($1::text[]) > 0 AND username = ANY($1))
        OR (cardinality($2::text[]) > 0 AND email = ANY($2))`,
    [uList, eList]
  );
  return result.rows;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const getAllUsers = async (): Promise<PublicUser[]> => {
  const result = await pool.query(
    "SELECT id, email, username, role, full_name, is_active, created_at, updated_at FROM accounts ORDER BY created_at DESC"
  );
  return result.rows;
};

export type UserListFilters = {
  role?: UserRole;
  roles?: UserRole[];
  search?: string;
  search_student?: string;
  search_teacher?: string;
  admin_class_id?: string;
};

export const queryUsersPaginated = async (
  limit: number,
  offset: number,
  opts?: UserListFilters
): Promise<{ items: PublicUser[]; total: number }> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (opts?.roles?.length) {
    conditions.push(`a.role = ANY($${idx++}::text[])`);
    values.push(opts.roles);
  } else if (opts?.role) {
    conditions.push(`a.role = $${idx++}`);
    values.push(opts.role);
  }
  if (opts?.admin_class_id) {
    conditions.push(`a.admin_class_id = $${idx++}`);
    values.push(opts.admin_class_id);
  }
  const studentQ = opts?.search_student?.trim() || opts?.search?.trim();
  if (studentQ) {
    conditions.push(
      `(a.email ILIKE $${idx} OR a.username ILIKE $${idx} OR COALESCE(a.full_name, '') ILIKE $${idx})`
    );
    values.push(`%${studentQ}%`);
    idx++;
  }
  const teacherQ = opts?.search_teacher?.trim();
  if (teacherQ) {
    conditions.push(
      `(COALESCE(m.full_name, '') ILIKE $${idx} OR COALESCE(m.email, '') ILIKE $${idx} OR COALESCE(m.username, '') ILIKE $${idx})`
    );
    values.push(`%${teacherQ}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const fromClause = `
    FROM accounts a
    LEFT JOIN admin_classes ac ON ac.id = a.admin_class_id
    LEFT JOIN accounts m ON m.id = ac.manager_teacher_id
  `;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${fromClause} ${where}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

  const baseSelect = `
    SELECT a.id, a.email, a.username, a.role, a.full_name, a.is_active, a.first_login,
           a.password_plain, a.admin_class_id, a.created_at, a.updated_at,
           m.full_name AS homeroom_teacher_name,
           m.email AS homeroom_teacher_email,
           ac.display_name AS admin_class_name,
           (SELECT string_agg(ac2.display_name, ', ' ORDER BY ac2.display_name)
            FROM admin_classes ac2 WHERE ac2.manager_teacher_id = a.id) AS managed_class_names
  `;

  const result = await pool.query(
    `${baseSelect} ${fromClause} ${where}
     ORDER BY a.role ASC, a.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return { items: result.rows as PublicUser[], total };
};

export const createUser = async (
  email: string,
  username: string,
  hashedPassword: string,
  role: UserRole,
  fullName?: string,
  passwordPlain?: string | null,
  opts?: { first_login?: boolean; admin_class_id?: string | null }
): Promise<User> => {
  const result = await pool.query(
    `INSERT INTO accounts (email, username, hashed_password, password_plain, role, full_name, first_login, admin_class_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      email,
      username,
      hashedPassword,
      passwordPlain ?? null,
      role,
      fullName ?? null,
      opts?.first_login ?? false,
      opts?.admin_class_id ?? null,
    ]
  );
  return result.rows[0];
};

export type UserUpdateFields = {
  full_name?: string | null;
  is_active?: boolean;
  role?: UserRole;
  username?: string;
  email?: string;
  hashed_password?: string;
  password_plain?: string | null;
  first_login?: boolean;
};

export const updateUser = async (
  id: string,
  fields: UserUpdateFields
): Promise<User | null> => {
  const allowed: Array<keyof UserUpdateFields> = [
    "full_name",
    "is_active",
    "role",
    "username",
    "email",
    "hashed_password",
    "password_plain",
    "first_login",
  ];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return null;
  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);
  const result = await pool.query(
    `UPDATE accounts SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] ?? null;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM accounts WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};