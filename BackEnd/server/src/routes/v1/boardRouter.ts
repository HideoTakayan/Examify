import  express  from "express";
import { boardValidation } from '~/validation/boardValidation'
import { StatusCodes } from "http-status-codes";

const boardRouter  = express.Router();

boardRouter.route('/')
    .get((req ,res) => {
        res.json({Message : "thank for watching"})
    })
    .post(boardValidation.createNew)

export default boardRouter;