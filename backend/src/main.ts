import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import mongoose from 'mongoose';

mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, converted) => {
    delete (converted as any)._id;
    delete (converted as any).__v;
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const { LoggerInterceptor } = await import('./logger.interceptor.js');
  app.useGlobalInterceptors(new LoggerInterceptor());
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    // Add these so frontend can pass trace headers successfully!
    allowedHeaders: 'Content-Type, Accept, Authorization, sentry-trace, baggage, x-user-id',
  });

  await app.listen(process.env.PORT || 8080, "0.0.0.0");
}
bootstrap();
