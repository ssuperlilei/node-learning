/**
 * 鉴权路由：登录、注册（无需鉴权）
 */
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { handleValidation, validateLogin, validateRegister } from '../middleware';

function asyncHandler(fn: (req: import('express').Request, res: import('express').Response) => Promise<void>) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

const router = Router();

router.post('/login', validateLogin, handleValidation, asyncHandler(authController.login));
router.post('/register', validateRegister, handleValidation, asyncHandler(authController.register));

export default router;
