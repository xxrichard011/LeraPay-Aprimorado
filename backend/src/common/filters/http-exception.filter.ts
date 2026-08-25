import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Pega qualquer erro que escapou dos controllers e devolve sempre no formato de JSON
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : null;

    const message =
      body && typeof body === 'object' && 'message' in body
        ? (body as any).message
        : isHttp
          ? exception.message
          : 'Erro interno inesperado';

    // Erro que não é HttpException é bug mesmo, então loga o stack completo pra investigar
    if (!isHttp) {
      this.logger.error(
        `Unhandled error cid=${req.correlationId}: ${(exception as Error)?.stack ?? exception}`,
      );
    }

    res.status(status).json({
      statusCode: status,
      path: req.originalUrl,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
