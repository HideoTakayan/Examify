import {
  ClassDetail,
  getAllClasses,
  getClassesByStudent,
  getClassesByTeacher,
} from "~/models/class.model";
import type { UserRole } from "~/models/user.model";

export const listClassesForRole = async (
  userId: string,
  role: UserRole
): Promise<ClassDetail[]> => {
  if (role === "admin") return getAllClasses();
  if (role === "teacher") return getClassesByTeacher(userId);
  return getClassesByStudent(userId);
};
