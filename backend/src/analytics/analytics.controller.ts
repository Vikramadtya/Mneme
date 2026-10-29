import { Controller, Get, Inject, Query } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UserId } from '../auth/user.decorator.js';
import { AnalyticsService } from './analytics.service.js';

class SummaryQueryDto {
  @IsOptional() @IsString() @MaxLength(64)
  tz?: string;
}

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query() query: SummaryQueryDto, @UserId() userId: string) {
    return this.analytics.summary(userId, query.tz);
  }
}
