import { Request, Response, NextFunction } from "express";
import {
  assignGroupsToProgram,
  assignSubjectsToProgram,
  unassignGroupFromProgram,
  unassignSubjectFromProgram,
  applyBaseGroupsToProgram,
} from "~/models/programCatalog.model";
import { getSubjectCatalog } from "~/services/subjectCatalog.service";

export const assignProgramGroupsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const programId = req.params.id;
    const groupIds = Array.isArray(req.body?.group_ids)
      ? (req.body.group_ids as string[]).filter((x) => typeof x === "string" && x.trim())
      : [];
    if (groupIds.length === 0) {
      res.status(400).json({ success: false, error: "group_ids là bắt buộc" });
      return;
    }
    const added = await assignGroupsToProgram(programId, groupIds);
    const catalog = await getSubjectCatalog(programId);
    res.json({
      success: true,
      data: { assigned_groups: added, catalog },
      message: `Đã gán ${added} nhóm môn vào chương trình`,
    });
  } catch (err) {
    next(err);
  }
};

export const unassignProgramGroupController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const programId = req.params.id;
    const groupId = String(req.params.groupId ?? "").trim();
    if (!groupId) {
      res.status(400).json({ success: false, error: "groupId không hợp lệ" });
      return;
    }
    await unassignGroupFromProgram(programId, groupId);
    const catalog = await getSubjectCatalog(programId);
    res.json({ success: true, data: { catalog } });
  } catch (err) {
    next(err);
  }
};

export const assignProgramSubjectsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const programId = req.params.id;
    const subjectIds = Array.isArray(req.body?.subject_ids)
      ? (req.body.subject_ids as string[]).filter((x) => typeof x === "string" && x.trim())
      : [];
    if (subjectIds.length === 0) {
      res.status(400).json({ success: false, error: "subject_ids là bắt buộc" });
      return;
    }
    const added = await assignSubjectsToProgram(programId, subjectIds);
    const catalog = await getSubjectCatalog(programId);
    res.json({
      success: true,
      data: { assigned_subjects: added, catalog },
      message: `Đã gán ${added} môn vào chương trình`,
    });
  } catch (err) {
    next(err);
  }
};

export const unassignProgramSubjectController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const programId = req.params.id;
    const subjectId = String(req.params.subjectId ?? "").trim();
    if (!subjectId) {
      res.status(400).json({ success: false, error: "subjectId không hợp lệ" });
      return;
    }
    await unassignSubjectFromProgram(programId, subjectId);
    const catalog = await getSubjectCatalog(programId);
    res.json({ success: true, data: { catalog } });
  } catch (err) {
    next(err);
  }
};

export const applyProgramBaseGroupsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const added = await applyBaseGroupsToProgram(req.params.id);
    const catalog = await getSubjectCatalog(req.params.id);
    res.json({
      success: true,
      data: { applied: added, catalog },
      message: `Đã áp ${added} nhóm bắt buộc (base)`,
    });
  } catch (err) {
    next(err);
  }
};
