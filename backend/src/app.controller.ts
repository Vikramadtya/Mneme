import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './auth/public.decorator.js';

@Public()
@SkipThrottle()
@Controller()
export class AppController {
  @Get(['health', 'api/v1/health'])
  healthCheck() {
    return { status: 'ok', timestamp: new Date() };
  }
}
