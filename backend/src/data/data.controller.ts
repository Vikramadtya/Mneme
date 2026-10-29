import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserId } from '../auth/user.decorator.js';
import { DataService } from './data.service.js';

@Controller('api/v1/data')
export class DataController {
  constructor(@Inject(DataService) private data: DataService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('export')
  export(@UserId() userId: string) {
    return this.data.export(userId);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('import')
  import(@Body() body: unknown, @UserId() userId: string) {
    return this.data.import(userId, body);
  }
}
