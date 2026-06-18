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
    if (exception instanceof HttpException) {
      message = exception.getResponse();
    }

    const responseBody = {
      statusCode: httpStatus,
      message: typeof message === 'object' && message !== null && 'message' in message ? (message as any).message : message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
