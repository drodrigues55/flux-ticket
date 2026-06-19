import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { fail } from './api-response';
import { logger } from './logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = request.requestId || request.headers?.['x-request-id'] || 'req_unknown';
    
    // Detailed error trace is logged securely on the backend
    logger.error({
      requestId,
      err: exception,
      method: request.method,
      path: httpAdapter.getRequestUrl(request),
      statusCode: httpStatus,
    }, 'request failed');

    let message: string | object = 'An unexpected error occurred. Please contact support.';
    let code = httpStatus === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
    let details: unknown;

    if (exception instanceof HttpException) {
      message = exception.getResponse();
    }

    if (typeof message === 'object' && message !== null) {
      const response = message as any;
      code = response.code || code;
      details = response.details;
      message = response.message || message;
    }

    const responseBody = fail({
      statusCode: httpStatus,
      code,
      message,
      requestId: String(requestId),
      details,
    });

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
