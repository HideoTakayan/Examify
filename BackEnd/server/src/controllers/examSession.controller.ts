import { Request, Response, NextFunction } from "express";

export const startExamSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ success: false, message: "examId is required" });
    }

    const user = (req as any).user;

    const examSession = {
      id: "temp-session-id",
      examId,
      studentId: user.userId,
      startTime: new Date(),
      status: "active",
    };

    return res.status(201).json({ success: true, data: examSession });
  } catch (error) {
    next(error);
  }
};

export const submitSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "answers is required and must be an array" });
    }

    // TODO: compute score logic
    const result = {
      sessionId,
      answers,
      score: 0,
      status: "submitted",
    };

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
