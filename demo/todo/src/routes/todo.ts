/**
 * Todo 路由：仅做匹配与鉴权，业务由 controller + service 处理
 */
import { Router, Request, Response, NextFunction } from 'express';
import * as todoController from '../controllers/todoController';
import { authMiddleware } from '../middleware';
import {
  handleValidation,
  validateCreateTodo,
  validateUpdateTodo,
  validateIdParam,
} from '../middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const router = Router();

/** 以下接口均需登录鉴权 */
router.use(authMiddleware);

router.get('/', asyncHandler(todoController.list));
router.get('/with-user', asyncHandler(todoController.listWithUser));
router.get('/page', asyncHandler(todoController.listPaged));
router.get('/stats/completed', asyncHandler(todoController.statsCompleted));
router.post('/tx/toggle', asyncHandler(todoController.txToggle));

router.get('/:id', validateIdParam, handleValidation, asyncHandler(todoController.getById));
router.post('/', validateCreateTodo, handleValidation, asyncHandler(todoController.create));
router.put('/:id', validateIdParam, validateUpdateTodo, handleValidation, asyncHandler(todoController.update));
router.delete('/:id', validateIdParam, handleValidation, asyncHandler(todoController.remove));

export default router;
