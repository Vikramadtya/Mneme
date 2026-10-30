import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AppController } from './app.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { SerializeInterceptor } from './common/serialize.interceptor.js';
import { validateEnv } from './config/env.js';
import { DataModule } from './data/data.module.js';
import { LearningModule } from './learning/learning.module.js';
import { LoggerInterceptor } from './logger.interceptor.js';
import { DataIntegrityService } from './maintenance/data-integrity.service.js';
import { ModelsModule } from './models/models.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { VocabularyModule } from './vocabulary/vocabulary.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGO_URI') }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ModelsModule,
    AuthModule,
    VocabularyModule,
    LearningModule,
    AnalyticsModule,
    DataModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) },
    // Order matters: rate limit first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SerializeInterceptor },
    DataIntegrityService,
  ],
})
export class AppModule {}
