/**
 * Xóa dữ liệu phiên thi / điểm / thi lại để test lại từ đầu.
 *
 * Chạy (local hoặc Render shell, cần DATABASE_URL):
 *   npm run clear-exam-data
 *   npm run clear-exam-data -- --exam-id=<uuid>
 *   npm run clear-exam-data -- --student-email=lop10czodoi@gmail.com
 *   npm run clear-exam-data -- --student-email=... --limit=3   # chỉ xóa N phiên gần nhất
 */
import pool from "../src/config/db";

async function main() {
  const args = process.argv.slice(2);
  let examId = "";
  let studentEmail = "";
  let limit = 0;

  for (const arg of args) {
    if (arg.startsWith("--exam-id=")) examId = arg.slice("--exam-id=".length).trim();
    else if (arg.startsWith("--student-email=")) studentEmail = arg.slice("--student-email=".length).trim();
    else if (arg.startsWith("--limit=")) limit = Math.max(0, Number(arg.slice("--limit=".length)) || 0);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let studentId: string | null = null;
    if (studentEmail) {
      const trimmed = studentEmail.trim();
      const variant1 = trimmed
        .replace(/cozodoi/gi, "czodoi")
        .replace(/c2doi/gi, "czodoi")
        .trim();
      const variant2 = trimmed
        .replace(/cozodoi/gi, "c2doi")
        .replace(/czodoi/gi, "c2doi")
        .trim();

      const rows = await client.query<{ id: string; email: string }>(
        `SELECT id, email
         FROM accounts
         WHERE role = 'student'
           AND (
             email = $1
             OR email ILIKE $2
             OR email = $3
             OR email = $4
           )
         ORDER BY (email = $1) DESC, email ASC
         LIMIT 5`,
        [trimmed, `%${trimmed}%`, variant1, variant2]
      );

      if (rows.rows.length > 1) {
        const candidates = rows.rows.map((r) => `- ${r.email}`).join("\n");
        throw new Error(
          `Tìm thấy nhiều SV khớp '${trimmed}'. Hãy chạy lại với email chính xác một trong các email sau:\n${candidates}`
        );
      }
      studentId = rows.rows[0]?.id ?? null;
      if (!studentId) {
        throw new Error(`Không tìm thấy tài khoản email: ${studentEmail}`);
      }
    }

    const params: string[] = [];
    if (examId) params.push(examId);
    if (studentId) params.push(studentId);

    const sessionFilter = [
      examId ? "exam_id = $1" : "TRUE",
      studentId ? `student_id = $${examId ? 2 : 1}` : "TRUE",
    ].join(" AND ");

    // Nếu có --limit, chỉ xóa N phiên gần nhất (ưu tiên submitted_at, fallback started_at)
    let targetSessionIds: string[] | null = null;
    let targetExamIds: string[] | null = null;
    if (limit > 0) {
      const idRes = await client.query<{ id: string; exam_id: string }>(
        `SELECT id, exam_id
         FROM exam_sessions
         WHERE ${sessionFilter}
         ORDER BY COALESCE(submitted_at, started_at) DESC, created_at DESC
         LIMIT ${Math.min(200, limit)}`,
        params
      );
      targetSessionIds = idRes.rows.map((r) => r.id);
      targetExamIds = [...new Set(idRes.rows.map((r) => r.exam_id))];
    }

    const sessionCountRes = await client.query<{ cnt: number }>(
      targetSessionIds
        ? `SELECT $1::int AS cnt`
        : `SELECT COUNT(*)::int AS cnt FROM exam_sessions WHERE ${sessionFilter}`,
      targetSessionIds ? [targetSessionIds.length] : params
    );
    const sessionCount = sessionCountRes.rows[0]?.cnt ?? 0;

    if (sessionCount === 0) {
      console.log("[clear-exam-data] Không có phiên thi nào khớp bộ lọc.");
    } else {
      console.log(
        `[clear-exam-data] Sẽ xóa ${sessionCount} phiên thi` +
          (limit > 0 ? ` (limit=${limit}, gần nhất)` : "") +
          "..."
      );

      const sessionIds = targetSessionIds ?? [];
      const byIds = sessionIds.length > 0;
      const idParams: unknown[] = byIds ? [sessionIds] : params;
      const idFilter = byIds ? "s.id = ANY($1::uuid[])" : sessionFilter;
      const idFilterLoose = byIds
        ? "s.id = ANY($1::uuid[])"
        : sessionFilter.replace(/exam_id/g, "s.exam_id").replace(/student_id/g, "s.student_id");

      await client.query(
        `UPDATE exam_retake_grants g
         SET superseded_session_id = NULL, consumed_session_id = NULL
         WHERE EXISTS (
           SELECT 1 FROM exam_sessions s
           WHERE ${idFilterLoose}
             AND (g.superseded_session_id = s.id OR g.consumed_session_id = s.id)
         )`,
        idParams
      );

      await client.query(
        `UPDATE exam_sessions SET superseded_by = NULL, retake_grant_id = NULL
         WHERE ${byIds ? "id = ANY($1::uuid[])" : sessionFilter}`,
        idParams
      );

      await client.query(
        `DELETE FROM exam_integrity_events e
         WHERE EXISTS (
           SELECT 1 FROM exam_sessions s
           WHERE s.id = e.session_id AND ${idFilterLoose}
         )`,
        idParams
      );

      await client.query(
        `DELETE FROM exam_proctor_logs p
         WHERE EXISTS (
           SELECT 1 FROM exam_sessions s
           WHERE s.id = p.session_id AND ${idFilterLoose}
         )`,
        idParams
      );

      const deleted = await client.query(
        `DELETE FROM exam_sessions s WHERE ${idFilter} RETURNING s.id`,
        idParams
      );
      console.log(`[clear-exam-data] Đã xóa ${deleted.rowCount} phiên thi.`);
    }

    // Xóa quyền thi lại theo phạm vi phù hợp:
    // - Nếu limit: chỉ xóa grants của các exam bị ảnh hưởng (tránh xóa toàn bộ lịch sử SV)
    // - Nếu không limit: giữ behavior cũ (xóa theo filter examId/studentId)
    if (studentId) {
      if (limit > 0) {
        const examIds = examId ? [examId] : targetExamIds ?? [];
        if (examIds.length > 0) {
          const grants = await client.query(
            `DELETE FROM exam_retake_grants
             WHERE student_id = $1 AND exam_id = ANY($2::uuid[])
             RETURNING id`,
            [studentId, examIds]
          );
          console.log(`[clear-exam-data] Đã xóa ${grants.rowCount} quyền thi lại (theo exam).`);
        } else {
          console.log("[clear-exam-data] Bỏ qua xóa quyền thi lại (không xác định exam bị ảnh hưởng).");
        }
      } else {
        const grantFilter = [
          examId ? "exam_id = $1" : "TRUE",
          `student_id = $${examId ? 2 : 1}`,
        ].join(" AND ");
        const grants = await client.query(
          `DELETE FROM exam_retake_grants WHERE ${grantFilter} RETURNING id`,
          params
        );
        console.log(`[clear-exam-data] Đã xóa ${grants.rowCount} quyền thi lại.`);
      }
    } else {
      const grants = await client.query(`DELETE FROM exam_retake_grants RETURNING id`);
      console.log(`[clear-exam-data] Đã xóa ${grants.rowCount} quyền thi lại (global).`);
    }

    // Dừng runtime:
    // - Nếu có examId: dừng đúng exam đó
    // - Nếu limit: dừng các exam của sessions vừa xóa
    // - Nếu không: behavior cũ (dừng toàn bộ runtime active)
    if (examId) {
      const runtime = await client.query(
        `UPDATE exam_runtime_state SET is_active = false, ends_at = NOW()
         WHERE is_active = true AND exam_id = $1
         RETURNING exam_id`,
        [examId]
      );
      console.log(`[clear-exam-data] Đã dừng ${runtime.rowCount} phiên runtime đang active.`);
    } else if (limit > 0 && targetExamIds && targetExamIds.length > 0) {
      const runtime = await client.query(
        `UPDATE exam_runtime_state SET is_active = false, ends_at = NOW()
         WHERE is_active = true AND exam_id = ANY($1::uuid[])
         RETURNING exam_id`,
        [targetExamIds]
      );
      console.log(`[clear-exam-data] Đã dừng ${runtime.rowCount} phiên runtime đang active (theo exam).`);
    } else {
      const runtime = await client.query(
        `UPDATE exam_runtime_state SET is_active = false, ends_at = NOW()
         WHERE is_active = true
         RETURNING exam_id`
      );
      console.log(`[clear-exam-data] Đã dừng ${runtime.rowCount} phiên runtime đang active.`);
    }

    await client.query("COMMIT");
    console.log("[clear-exam-data] Xong. SV có thể vào làm lại sau khi GV mở phiên thi.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[clear-exam-data] Lỗi:", err);
  process.exit(1);
});
