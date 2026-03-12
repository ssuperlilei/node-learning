import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let body: ApiResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'object' && payload !== null && 'code' in payload && 'message' in payload) {
        body = payload as ApiResponse;
        this.logger.error({ err: exception, status }, 'request error');
        res.status(status).json(body);
        return;
      }
      message = typeof payload === 'string' ? payload : (payload as { message?: string }).message ?? message;
      if (Array.isArray(message)) message = message[0] ?? '参数校验失败';
    } else if (exception instanceof Error) {
      message = exception.message;
      const errWithCode = exception as unknown as { statusCode?: number };
      if (errWithCode.statusCode) status = errWithCode.statusCode;
    }

    body = { code: status >= 400 ? status : 500, message };
    this.logger.error({ err: exception, status, message }, 'request error');
    res.status(status >= 400 ? status : 500).json(body);
  }
}
