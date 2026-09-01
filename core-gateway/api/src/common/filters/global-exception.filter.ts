import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLogger } from '../logger/structured-logger.service.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLogger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any)['correlationId'] || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let retryable = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      
      message = typeof res === 'string' ? res : (res.message || res.error || message);
      
      if (status === HttpStatus.UNAUTHORIZED) errorCode = 'AUTH_ERROR';
      else if (status === HttpStatus.FORBIDDEN) errorCode = 'AUTHORIZATION_ERROR';
      else if (status === HttpStatus.NOT_FOUND) errorCode = 'NOT_FOUND';
      else if (status === HttpStatus.BAD_REQUEST) errorCode = 'BAD_REQUEST';
      else if (status === HttpStatus.CONFLICT) errorCode = 'FHIR_CONFLICT';
      else errorCode = 'HTTP_ERROR';
      
      // Typical HTTP errors are not retryable except maybe 429/503
      retryable = [429, 502, 503, 504].includes(status);
    } else if (exception instanceof Error) {
      // Map known internal string errors
      if (exception.message.includes('FHIR_CONFLICT')) {
        status = HttpStatus.CONFLICT;
        errorCode = 'FHIR_CONFLICT';
        message = 'The clinical record was modified elsewhere.';
      } else if (exception.message.includes('TIMEOUT')) {
        status = HttpStatus.GATEWAY_TIMEOUT;
        errorCode = 'TIMEOUT';
        message = 'Upstream service timed out.';
        retryable = true;
      } else {
        message = process.env.NODE_ENV === 'production' ? message : exception.message;
      }
    }

    this.logger.error(`[${requestId}] ${errorCode}: ${message}`, exception instanceof Error ? exception.stack : undefined);

    response.status(status).json({
      errorCode,
      message,
      requestId,
      retryable,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
