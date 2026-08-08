import pool from "~/config/db";
import { canAccessExam } from "~/models/examCollaborators.model";
import { teacherManagesClass } from "~/models/adminClass.model";
import {
  createRetakeGrant,
  getApprovedRetakeGrant,
  getRetakeGrantsByExam,
  getMyApprovedRetakeGrants,
  consumeRetakeGrant,
  revokeRetakeGrant,
  voidSessionForRetake,
  linkSupersededBy,
  type ExamRetakeGrant,
} from "~/models/examRetakeGrant.model";
import { getLatestSubmittedSession } from "~/models/examsession.model";
import { getExamById } from "~/models/exam.model";
import { createNotification } from "~/models/userNotification.model";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function canManageExamRetake(
  examId: string,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === "admin") return true;
  if (role !== "teacher") return false;
  if (await canAccessExam(examId, userId)) return true;

  const exam = await getExamById(examId);
  if (exam?.admin_class_id) {
    return teacherManagesClass(userId, exam.admin_class_id);
  }
  return false;
}

export async function grantRetakeService(payload: {
  examId: string;
  studentId: string;
  grantedBy: string;
  grantedByRole: string;
  reason: string;
}): Promise<ExamRetakeGrant> {
  const { examId, studentId, grantedBy, grantedByRole, reason } = payload;
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw httpError(400, "Lý do thi lại là bắt buộc");

  if (!(await canManageExamRetake(examId, grantedBy, grantedByRole))) {
    throw httpError(403, "Không có quyền cấp thi lại bài thi này");
  }

  const exam = await getExamById(examId);
  if (!exam) throw httpError(404, "Không tìm thấy bài thi");

  const studentCheck = await pool.query(
    `SELECT id FROM accounts WHERE id = $1 AND role = 'student'`,
    [studentId]
  );
  if (!studentCheck.rows[0]) throw httpError(404, "Không tìm thấy sinh viên");

  const official = await getLatestSubmittedSession(examId, studentId);
  if (!official) {
    throw httpError(400, "Sinh viên chưa nộp bài — không cần cấp thi lại");
  }

  const activeCheck = await pool.query(
    `SELECT 1 FROM exam_sessions
     WHERE exam_id = $1 AND student_id = $2 AND status = 'active' AND voided_at IS NULL`,
    [examId, studentId]
  );
  if (activeCheck.rows.length > 0) {
    throw httpError(400, "Sinh viên đang làm bài — không thể cấp thi lại lúc này");
  }

  const existing = await getApprovedRetakeGrant(examId, studentId);
  if (existing) {
    throw httpError(409, "Sinh viên đã được cấp thi lại — chưa sử dụng quyền");
  }

  const grant = await createRetakeGrant({
    exam_id: examId,
    student_id: studentId,
    granted_by: grantedBy,
    reason: trimmedReason,
    superseded_session_id: official.id,
  });

  void createNotification(
    studentId,
    "[Thi lại] Được phép làm lại bài thi",
    `Giáo viên cho phép bạn thi lại "${exam.title}". Lý do: ${trimmedReason}`,
    "info",
    "/exams"
  ).catch(() => {});

  return grant;
}

export async function revokeRetakeService(
  grantId: string,
  actorId: string,
  actorRole: string
): Promise<ExamRetakeGrant> {
  const grantRow = await pool.query<ExamRetakeGrant>(
    `SELECT * FROM exam_retake_grants WHERE id = $1`,
    [grantId]
  );
  const grant = grantRow.rows[0];
  if (!grant) throw httpError(404, "Không tìm thấy quyền thi lại");

  if (!(await canManageExamRetake(grant.exam_id, actorId, actorRole))) {
    throw httpError(403, "Không có quyền thu hồi");
  }

  const revoked = await revokeRetakeGrant(grantId);
  if (!revoked) throw httpError(400, "Quyền thi lại không còn hiệu lực");

  return revoked;
}

export async function listRetakeGrantsForExamService(
  examId: string,
  actorId: string,
  actorRole: string
): Promise<ExamRetakeGrant[]> {
  if (!(await canManageExamRetake(examId, actorId, actorRole))) {
    throw httpError(403, "Không có quyền xem danh sách thi lại");
  }
  return getRetakeGrantsByExam(examId);
}

export async function listMyRetakeGrantsService(studentId: string): Promise<ExamRetakeGrant[]> {
  return getMyApprovedRetakeGrants(studentId);
}

/** Gọi sau khi INSERT phiên active mới (thi lại). */
export async function applyRetakeOnSessionStart(
  examId: string,
  studentId: string,
  newSessionId: string
): Promise<void> {
  const grant = await getApprovedRetakeGrant(examId, studentId);
  if (!grant) return;

  const official = await pool.query<{ id: string }>(
    `SELECT id FROM exam_sessions
     WHERE exam_id = $1 AND student_id = $2 AND status = 'submitted' AND voided_at IS NULL
     ORDER BY submitted_at DESC NULLS LAST LIMIT 1`,
    [examId, studentId]
  );
  const oldSession = official.rows[0];
  if (oldSession) {
    await voidSessionForRetake(oldSession.id, grant.id, grant.reason);
    await linkSupersededBy(oldSession.id, newSessionId);
  }

  await consumeRetakeGrant(grant.id, newSessionId);

  await pool.query(
    `UPDATE exam_sessions SET retake_grant_id = $2 WHERE id = $1`,
    [newSessionId, grant.id]
  );
}
