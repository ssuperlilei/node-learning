/**
 * 学习点：局部中间件 — 接口参数校验（express-validator）
 * 仅对挂载了该校验的路由生效，校验失败时返回 400 + 错误信息
 */
import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult, ValidationChain } from 'express-validator';

/** 校验结果处理：若有错误则响应 400 并终止，否则 next() */
export function handleValidation(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstMsg = errors.array({ onlyFirstError: true })[0];
    const message = firstMsg?.msg ?? '参数校验失败';
    res.status(400).json({ code: 400, message });
    return;
  }
  next();
}

/** 创建 Todo 的 body 校验规则（局部使用） */
export const validateCreateTodo: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('title 不能为空')
    .isLength({ max: 500 })
    .withMessage('title 长度不能超过 500'),
];

/** 更新 Todo 的 body 校验规则 */
export const validateUpdateTodo: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('title 不能为空字符串')
    .isLength({ max: 500 })
    .withMessage('title 长度不能超过 500'),
  body('completed').optional().isBoolean().withMessage('completed 必须为布尔值'),
];

/** 路径参数 id 必须为数字（用于 GET/PUT/DELETE /:id） */
export const validateIdParam: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('id 必须为正整数'),
];
