import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result: { data: T; message?: string } | T) => {
        if (result && typeof result === 'object' && 'data' in result) {
          return {
            code: 0,
            message: (result as { message?: string }).message ?? '成功',
            data: (result as { data: T }).data,
          };
        }
        return {
          code: 0,
          message: '成功',
          data: result as T,
        };
      }),
    );
  }
}
