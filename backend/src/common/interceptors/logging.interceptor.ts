import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// logd metodo, rota, status e tempo de cada request que passa pela API
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} +${ms}ms cid=${req.correlationId}`,
          );
        },
        error: (err) => {
          const ms = Date.now() - start;
          this.logger.error(
            `${req.method} ${req.originalUrl} FAILED +${ms}ms cid=${req.correlationId}: ${err?.message}`,
          );
        },
      }),
    );
  }
}
