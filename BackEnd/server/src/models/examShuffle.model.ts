import pool from "~/config/db";

/**
 * Shuffle questions within chapters for an exam session.
 * Questions within the same chapter are shuffled but chapters maintain their order.
 * This provides "controlled shuffle" so questions from the same textbook chapter stay together.
 */

export const getQuestionsByExam = async (examId: string): Promise<{ id: string; chapter: number | null; display_order: number }[]> => {
  const result = await pool.query(
    `SELECT q.id, q.display_order,
            COALESCE(q.chapter, qb.chapter, 0) AS chapter
     FROM questions q
     LEFT JOIN question_bank qb ON q.question_bank_id = qb.id
     WHERE q.exam_id = $1
     ORDER BY chapter ASC, q.display_order ASC`,
    [examId]
  );
  return result.rows.map(r => ({
    id: r.id,
    chapter: r.chapter ?? null,
    display_order: Number(r.display_order),
  }));
};

export const shuffleQuestionsByChapter = async (examId: string): Promise<{ id: string; new_order: number }[]> => {
  const questions = await getQuestionsByExam(examId);

  // Group by chapter
  const chapters = new Map<number | null, typeof questions>();
  for (const q of questions) {
    const ch = q.chapter;
    if (!chapters.has(ch)) chapters.set(ch, []);
    chapters.get(ch)!.push(q);
  }

  // Fisher-Yates shuffle within each chapter
  const shuffleArray = <T>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  // Reassign display_order globally
  const updates: { id: string; new_order: number }[] = [];
  let globalOrder = 0;

  const sortedChapters = [...chapters.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  for (const chapter of sortedChapters) {
    const shuffled = shuffleArray(chapters.get(chapter)!);
    for (const q of shuffled) {
      globalOrder += 1;
      updates.push({ id: q.id, new_order: globalOrder });
    }
  }

  // Persist to DB
  for (const { id, new_order } of updates) {
    await pool.query(
      "UPDATE questions SET display_order = $1 WHERE id = $2",
      [new_order, id]
    );
  }

  return updates;
};

export const getExamChapterMap = async (examId: string): Promise<Map<string, number>> => {
  const questions = await getQuestionsByExam(examId);
  const map = new Map<string, number>();
  for (const q of questions) {
    map.set(q.id, q.chapter ?? 0);
  }
  return map;
};

export const getChaptersUsedByExam = async (examId: string): Promise<number[]> => {
  const result = await pool.query(
    `SELECT DISTINCT COALESCE(q.chapter, qb.chapter, 0) AS chapter
     FROM questions q
     LEFT JOIN question_bank qb ON q.question_bank_id = qb.id
     WHERE q.exam_id = $1 AND COALESCE(q.chapter, qb.chapter) IS NOT NULL
     ORDER BY chapter ASC`,
    [examId]
  );
  return result.rows.map(r => Number(r.chapter));
};