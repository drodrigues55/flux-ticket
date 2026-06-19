import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { validateRuntimeEnv } from './env.validation';
import { requestIdMiddleware } from './request-id.middleware';
import { logger } from './logger';

async function bootstrap() {
  validateRuntimeEnv();
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: false });
  app.enableCors();
  app.use(requestIdMiddleware);

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.info({ port }, 'api-write server listening');
}
bootstrap();
