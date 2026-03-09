/**
 * 学习点：请求/响应对象封装
 * 统一 API 响应格式，便于前端统一处理
 */
import { Response } from 'express';

/** 统一 API 响应体结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

/** 成功响应：code=0 */
export function successPayload<T>(data: T, message = '成功'): ApiResponse<T> {
  return { code: 0, message, data };
}

/** 错误响应：code 为业务或 HTTP 状态码 */
export function errorPayload(message: string, code = 400): ApiResponse<undefined> {
  return { code, message };
}

/**
 * 扩展 Express 的 Response，增加 .success() / .error() 便捷方法
 * 需在入口通过中间件挂载（见 middleware/responseHelper.ts）
 */
declare global {
  namespace Express {
    interface Response {
      /** 发送成功响应，统一格式 { code: 0, message, data } */
      success<T>(data: T, message?: string): void;
      /** 发送错误响应，统一格式 { code, message } */
      error(message: string, code?: number): void;
    }
  }
}

/** 在 Response 上挂载 success/error 的辅助实现（由中间件调用一次即可） */
export function attachResponseHelpers(res: Response): void {
  res.success = function <T>(data: T, message = '成功') {
    this.json(successPayload(data, message));
  };
  res.error = function (message: string, code = 400) {
    this.status(code >= 400 ? code : 400).json(errorPayload(message, code));
  };
}
