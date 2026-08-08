import pool from "~/config/db";
import type { QuestionType } from "~/models/question.model";

export type QBDifficulty = "DE" | "TRUNGBINH" | "KHO";

export interface QuestionBankItem {
  id: string;
  created_by: string;
  subject_id: string | null;
  content: string;
  question_type: QuestionType;
  options: Record<string, string> | null;
  correct_answer: string | string[] | null;
  points: number;
  difficulty: QBDifficulty;
  chapter: number | null;
  answer_hint: string | null;
  explanation: string | null;
  tags: string[];
  source_exam_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankCreateInput {
  content: string;
  question_type: QuestionType;
  options?: Record<string, string> | null;
  correct_answer?: string | string[] | null;
  points?: number;
  difficulty?: QBDifficulty;
  chapter?: number;
  subject_id?: string;
  answer_hint?: string;
  explanation?: string;
  tags?: string[];
}

export interface QuestionBankFilter {
  subject_id?: string;
  difficulty?: QBDifficulty;
  chapter?: number;
  question_type?: QuestionType;
  search?: string; // content search
  created_by?: string;
  tags?: string[];
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }
  return v as T;
}

function mapRow(row: any): QuestionBankItem {
  return {
    id: row.id,
    created_by: row.created_by,
    subject_id: row.subject_id ?? null,
    content: row.content,
    question_type: (row.question_type as QuestionType) || "mcq",
    options: row.options == null ? null : parseJson<Record<string, string>>(row.options, {}),
    correct_answer: row.correct_answer == null
      ? null
      : parseJson<string | string[]>(row.correct_answer, null as any),
    points: Number(row.points),
    difficulty: (row.difficulty as QBDifficulty) || "TRUNGBINH",
    chapter: row.chapter != null ? Number(row.chapter) : null,
    answer_hint: row.answer_hint ?? null,
    explanation: row.explanation ?? null,
    tags: row.tags ?? [],
    source_exam_id: row.source_exam_id ?? null,
    usage_count: Number(row.usage_count ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// --- CRUD ---

export const createQuestionBankItem = async (
  createdBy: string,
  input: QuestionBankCreateInput
): Promise<QuestionBankItem> => {
  const opts = input.question_type === "essay"
    ? null
    : input.options != null ? JSON.stringify(input.options) : null;
  const correct = input.question_type === "essay"
    ? null
    : input.correct_answer != null ? JSON.stringify(input.correct_answer) : null;

  const result = await pool.query(
    `INSERT INTO question_bank (created_by, subject_id, content, question_type, options, correct_answer, points, difficulty, chapter, answer_hint, explanation, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      createdBy,
      input.subject_id ?? null,
      input.content,
      input.question_type,
      opts,
      correct,
      input.points ?? 1,
      input.difficulty ?? "TRUNGBINH",
      input.chapter ?? null,
      input.answer_hint ?? null,
      input.explanation ?? null,
      input.tags ?? [],
    ]
  );
  return mapRow(result.rows[0]);
};

export const getQuestionBankItems = async (
  filter: QuestionBankFilter,
  limit = 50,
  offset = 0
): Promise<{ items: QuestionBankItem[]; total: number }> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filter.subject_id) {
    conditions.push(`subject_id = $${paramIdx++}`);
    params.push(filter.subject_id);
  }
  if (filter.difficulty) {
    conditions.push(`difficulty = $${paramIdx++}`);
    params.push(filter.difficulty);
  }
  if (filter.chapter != null) {
    conditions.push(`chapter = $${paramIdx++}`);
    params.push(filter.chapter);
  }
  if (filter.question_type) {
    conditions.push(`question_type = $${paramIdx++}`);
    params.push(filter.question_type);
  }
  if (filter.search) {
    conditions.push(`content ILIKE $${paramIdx++}`);
    params.push(`%${filter.search}%`);
  }
  if (filter.created_by) {
    conditions.push(`created_by = $${paramIdx++}`);
    params.push(filter.created_by);
  }
  if (filter.tags && filter.tags.length > 0) {
    conditions.push(`tags && $${paramIdx++}`);
    params.push(filter.tags);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM question_bank ${where}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const q = `SELECT * FROM question_bank ${where}
    ORDER BY created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  const result = await pool.query(q, [...params, limit, offset]);
  return { items: result.rows.map(mapRow), total };
};

export const getQuestionBankById = async (id: string): Promise<QuestionBankItem | null> => {
  const result = await pool.query("SELECT * FROM question_bank WHERE id = $1", [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

export const updateQuestionBankItem = async (
  id: string,
  input: Partial<QuestionBankCreateInput>
): Promise<QuestionBankItem | null> => {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.content !== undefined) { fields.push(`content = $${idx++}`); params.push(input.content); }
  if (input.options !== undefined) {
    const opts = input.question_type === "essay" ? null : JSON.stringify(input.options);
    fields.push(`options = $${idx++}`); params.push(opts);
  }
  if (input.correct_answer !== undefined) {
    const correct = input.question_type === "essay" ? null : JSON.stringify(input.correct_answer);
    fields.push(`correct_answer = $${idx++}`); params.push(correct);
  }
  if (input.points !== undefined) { fields.push(`points = $${idx++}`); params.push(input.points); }
  if (input.difficulty !== undefined) { fields.push(`difficulty = $${idx++}`); params.push(input.difficulty); }
  if (input.chapter !== undefined) { fields.push(`chapter = $${idx++}`); params.push(input.chapter); }
  if (input.subject_id !== undefined) { fields.push(`subject_id = $${idx++}`); params.push(input.subject_id); }
  if (input.answer_hint !== undefined) { fields.push(`answer_hint = $${idx++}`); params.push(input.answer_hint); }
  if (input.explanation !== undefined) { fields.push(`explanation = $${idx++}`); params.push(input.explanation); }
  if (input.tags !== undefined) { fields.push(`tags = $${idx++}`); params.push(input.tags); }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query(
    `UPDATE question_bank SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

export const deleteQuestionBankItem = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM question_bank WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};

// --- Import from question_bank to exam ---
export const importToExam = async (
  questionBankId: string,
  examId: string,
  opts?: { displayOrder?: number; versionIndex?: number }
): Promise<{ question_id: string }> => {
  const qb = await getQuestionBankById(questionBankId);
  if (!qb) throw new Error("Question bank item not found");
  if (!Number.isInteger(qb.chapter) || Number(qb.chapter) <= 0) {
    throw new Error("Question bank item phải có chương hợp lệ trước khi thêm vào đề");
  }

  const optionsJson = qb.question_type === "essay"
    ? null
    : qb.options != null ? JSON.stringify(qb.options) : null;
  const correctJson = qb.question_type === "essay"
    ? null
    : qb.correct_answer != null ? JSON.stringify(qb.correct_answer) : null;
  const versionIndex = Math.max(0, Math.min(3, Number(opts?.versionIndex ?? 0)));

  const result = await pool.query(
    `INSERT INTO questions (
       exam_id, content, question_type, options, correct_answer, points,
       display_order, question_bank_id, version_index, difficulty, chapter, answer_hint
     )
     VALUES (
       $1, $2, $3, $4, $5, $6,
       COALESCE($7, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM questions WHERE exam_id = $1 AND version_index = $8)),
       $9, $8, $10, $11, $12
     )
     RETURNING id`,
    [
      examId,
      qb.content,
      qb.question_type,
      optionsJson,
      correctJson,
      qb.points,
      opts?.displayOrder ?? null,
      versionIndex,
      questionBankId,
      qb.difficulty,
      qb.chapter,
      qb.answer_hint ?? null,
    ]
  );

  // Increment usage_count
  await pool.query(
    `UPDATE question_bank SET usage_count = usage_count + 1 WHERE id = $1`,
    [questionBankId]
  );

  return { question_id: result.rows[0].id };
};