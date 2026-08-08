import Joi from "joi";
import { StatusCodes } from "http-status-codes";
import { abort, title } from "node:process";
import { Request, Response, NextFunction } from "express";

const createNew = async (req: Request, res: Response, next: NextFunction) => {
  const correctCondition = Joi.object({
    title: Joi.string().required().min(3).max(30).trim().strict(),
    description: Joi.string().required().min(3).max(30).trim().strict(),
  });

  try {
    console.log("res.body", req.body , { abortEarly : true });
    await correctCondition.validateAsync(req.body);
    // next()
  } catch (error : any) {
    res.status(StatusCodes.BAD_GATEWAY).json({ error: new Error(error).message });
  }

  res.status(StatusCodes.CREATED).json({ message: `Get board id` });
};

export const boardValidation = {
  createNew,
};
