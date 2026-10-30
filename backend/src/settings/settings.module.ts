import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, ReminderService],
})
export class SettingsModule {}
