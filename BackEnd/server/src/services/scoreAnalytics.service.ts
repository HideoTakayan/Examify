import {
  getScoreDistributionByExam,
  getSubjectsForAdminClass,
  getScoreAnalyticsBySubject,
} from "~/models/scoreAnalytics.model";
import { getAdminClassByManager, teacherManagesClass } from "~/models/adminClass.model";

export async function resolveAdminClassIdForAnalytics(
  role: string | undefined,
  userId: string | undefined,
  queryClassId?: string
): Promise<string | null | undefined> {
  if (role === "admin") {
    const id = queryClassId?.trim();
    return id || null;
  }
  if (role === "teacher" && userId) {
    const q = queryClassId?.trim();
    if (q && (await teacherManagesClass(userId, q))) return q;
    const ac = await getAdminClassByManager(userId);
    return ac?.id ?? undefined;
  }
  return undefined;
}

export async function assertTeacherCanAccessClass(
  role: string | undefined,
  userId: string | undefined,
  adminClassId: string | null
): Promise<void> {
  if (role !== "teacher" || !userId || !adminClassId) return;
  const ok = await teacherManagesClass(userId, adminClassId);
  if (!ok) {
    throw Object.assign(new Error("Không có quyền xem lớp này"), { status: 403 });
  }
}

export const getExamScoreDistribution = async (examId: string) => {
  const data = await getScoreDistributionByExam(examId);
  if (!data) throw Object.assign(new Error("Exam not found"), { status: 404 });
  return data;
};

export const getSubjectOptions = async (adminClassId: string | null) => {
  return getSubjectsForAdminClass(adminClassId);
};

export const getSubjectScoreAnalytics = async (
  adminClassId: string | null,
  subjectId: string
) => {
  const data = await getScoreAnalyticsBySubject(adminClassId, subjectId);
  if (!data) throw Object.assign(new Error("Subject not found"), { status: 404 });
  return data;
};
