import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Post, Put, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/public.decorator.js';
import { UserId } from '../auth/user.decorator.js';
import { PushSubscriptionDto, UnsubscribeDto, UpdateSettingsDto } from './dto/settings.dto.js';
import { ReminderService } from './reminder.service.js';
import { SettingsService } from './settings.service.js';

@Controller('api/v1')
export class SettingsController {
  constructor(
    @Inject(SettingsService) private settings: SettingsService,
    @Inject(ReminderService) private reminders: ReminderService,
    @Inject(ConfigService) private config: ConfigService,
  ) {}

  @Get('settings')
  get(@UserId() userId: string) {
    return this.settings.get(userId);
  }

  @Put('settings')
  update(@Body() body: UpdateSettingsDto, @UserId() userId: string) {
    return this.settings.update(userId, body);
  }

  @Post('settings/push')
  subscribe(@Body() body: PushSubscriptionDto, @UserId() userId: string) {
    return this.settings.subscribe(userId, body);
  }

  @HttpCode(200)
  @Delete('settings/push')
  unsubscribe(@Body() body: UnsubscribeDto, @UserId() userId: string) {
    return this.settings.unsubscribe(userId, body.endpoint);
  }

  /** Called by an external scheduler; protected by a shared secret instead of a user token. */
  @Public()
  @HttpCode(200)
  @Post('reminders/dispatch')
  dispatch(@Headers('x-cron-secret') provided?: string) {
    const secret = this.config.get<string>('CRON_SECRET');
    const a = Buffer.from(provided ?? '');
    const b = Buffer.from(secret ?? '');
    if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return this.reminders.dispatch();
  }
}
