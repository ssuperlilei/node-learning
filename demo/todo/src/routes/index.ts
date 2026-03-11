/**
 * 路由汇总：统一挂载
 */
import { Router } from 'express';
import authRouter from './auth';
import todoRouter from './todo';

const router = Router();

router.use('/auth', authRouter);
router.use('/todos', todoRouter);

export default router;
