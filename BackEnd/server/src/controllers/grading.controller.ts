import { Request, Response, NextFunction } from "express";
import {
  getOfferingsByTeacher,
  getStudentsByOffering,
  saveGrades,
  syncExamGrades,
  assertTeacherOwnsOffering,
} from "~/services/grading.service";

export const getOfferingsController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const teacherId = user?.userId;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    const offerings = await getOfferingsByTeacher(teacherId);
    res.json(offerings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOfferingStudentsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offeringId = req.params.id;
    const user = (req as any).user;
    await assertTeacherOwnsOffering(offeringId, user.userId, user.role);

    const students = await getStudentsByOffering(offeringId);
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const saveGradesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offeringId = req.params.id;
    const user = (req as any).user;
    await assertTeacherOwnsOffering(offeringId, user.userId, user.role);

    const { grades } = req.body; // Array of { student_id, final_score }
    
    if (!grades || !Array.isArray(grades)) {
      return res.status(400).json({ message: "Invalid grades format" });
    }

    await saveGrades(offeringId, grades);
    res.json({ message: "Grades saved successfully" });
  } catch (error) {
    if ((error as any).status === 403) {
      return res.status(403).json({ message: (error as any).message });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const syncExamGradesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offeringId = req.params.id;
    const user = (req as any).user;
    await assertTeacherOwnsOffering(offeringId, user.userId, user.role);

    const result = await syncExamGrades(offeringId);
    res.json({ message: "Grades synchronized successfully", syncedCount: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
