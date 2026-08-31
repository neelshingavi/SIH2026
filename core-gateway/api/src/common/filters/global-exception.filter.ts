import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface SafeErrorResponse {
  errorCode: string;
  message: string;
  requestId: string;
  retryable: boolean;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request as any).correlationId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let retryable = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody: any = exception.getResponse();
      
      message = typeof responseBody === 'string' ? responseBody : responseBody.message || message;
      
      if (status === HttpStatus.UNAUTHORIZED) errorCode = 'AUTH_ERROR';
      else if (status === HttpStatus.FORBIDDEN) errorCode = 'AUTHORIZATION_ERROR';
      else if (status === HttpStatus.NOT_FOUND) errorCode = 'NOT_FOUND';
      else if (status === HttpStatus.BAD_REQUEST) errorCode = 'VALIDATION_ERROR';
      else if (status === HttpStatus.CONFLICT) errorCode = 'CONFLICT_ERROR';
      
      // 5xx and timeouts are generally retryable, others are not
      if (status >= 500 && status !== 501) retryable = true;
    } else {
      // Map other exceptions
      if (exception.code === 'ECONNREFUSED' || exception.code === 'ETIMEDOUT') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        errorCode = 'NETWORK_ERROR';
        message = 'Upstream service is unavailable.';
        retryable = true;
      }
    }

    // Structured logging of the error
    this.logger.error(JSON.stringify({
      level: 'ERROR',
      event: 'API_ERROR',
      errorCode,
      message: exception.message,
      stack: exception.stack, // Internal log only, never sent to client
      requestId: correlationId,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.userId || 'anonymous'
    }));

    // Safe error response (no stack trace, no internal DB messages)
    const errorResponse: SafeErrorResponse = {
      errorCode,
      message,
      requestId: correlationId,
      retryable
    };

    response.status(status).json(errorResponse);
  }
}
