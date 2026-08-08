import { Router } from 'express';
import { getStudentTranscript } from '../controllers/studentTranscript.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getStudentTranscript);

export default router;
