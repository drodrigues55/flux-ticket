import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId = 'err_' + Math.random().toString(36).substring(2, 10);
    
    // Detailed error trace is logged securely on the backend
    console.error(`[ERROR] [Correlation ID: ${correlationId}]`, exception);

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

    const responseBody = {
      statusCode: httpStatus,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      correlationId,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
