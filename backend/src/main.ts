import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  const sampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: sampleRate,
    profilesSampleRate: sampleRate,
  });
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1); // behind Render/Vercel so rate limiting sees the real client IP
  app.use(helmet());
  // Backup imports can be large; every other route keeps Express's small default limit.
  app.use('/api/v1/data/import', json({ limit: '10mb' }));

  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
    methods: 'GET,HEAD,PUT,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, sentry-trace, baggage',
  });
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 8080, '0.0.0.0');
}
bootstrap();
