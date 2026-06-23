import 'reflect-metadata';
import compression from 'compression';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { validateRuntimeEnv } from './env.validation';
import { requestIdMiddleware } from './request-id.middleware';
import { logger } from './logger';
import { captureException, initSentry } from './sentry';

async function bootstrap() {
  validateRuntimeEnv();
  initSentry('api-write');

  // Production Security check
  const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (isProd) {
    const jwtSecret = process.env.JWT_SECRET;
    const hmacSecret = process.env.HMAC_SECRET || process.env.HMAC_SECRET_KEY;

    if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('replace-with')) {
      throw new Error('FATAL: JWT_SECRET must be set in production, have at least 32 characters, and not be default placeholder.');
    }
    if (!hmacSecret || hmacSecret.length < 32 || hmacSecret.includes('replace-with')) {
      throw new Error('FATAL: HMAC_SECRET must be set in production, have at least 32 characters, and not be default placeholder.');
    }
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter(), { rawBody: true, logger: false });
  app.use(compression({ threshold: 0 }));

  // CORS Hardening
  if (isProd) {
    app.enableCors({
      origin: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : ['https://fluxtickets.com', 'https://staff.fluxtickets.com'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  } else {
    app.enableCors({ origin: '*' });
  }

  // Security Headers Middleware (Helmet Equivalent)
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=15768000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    next();
  });

  app.use(requestIdMiddleware);

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.info({ port }, 'api-write server listening');
}
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled rejection');
  captureException(reason, { service: 'api-write', type: 'unhandledRejection' });
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'uncaught exception');
  captureException(error, { service: 'api-write', type: 'uncaughtException' });
});

bootstrap();
