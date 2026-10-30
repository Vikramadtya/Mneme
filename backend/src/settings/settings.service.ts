import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { PushSubscriptionDto, UpdateSettingsDto } from './dto/settings.dto.js';
import { UserSettings } from './schemas/user-settings.schema.js';

export const DEFAULT_DAILY_GOAL = 20;

export function validTimezone(tz?: string): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(UserSettings.name) private settings: Model<UserSettings>,
    @Inject(ConfigService) private config: ConfigService,
  ) {}

  async get(userId: string) {
    const doc = await this.settings.findOne({ userId }).lean();
    return {
      dailyGoal: doc?.dailyGoal ?? DEFAULT_DAILY_GOAL,
      reminderHour: doc?.reminderHour ?? null,
      timezone: doc?.timezone ?? 'UTC',
      pushEnabled: (doc?.pushSubscriptions?.length ?? 0) > 0,
      // The browser needs this to create a push subscription; reminders are unavailable without it.
      vapidPublicKey: this.config.get<string>('VAPID_PUBLIC_KEY') ?? null,
      aiEnabled: Boolean(this.config.get<string>('ANTHROPIC_API_KEY')),
    };
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    const set: Record<string, unknown> = {};
    if (dto.dailyGoal !== undefined) set.dailyGoal = dto.dailyGoal;
    if (dto.reminderHour !== undefined) set.reminderHour = dto.reminderHour;
    if (dto.timezone !== undefined) set.timezone = validTimezone(dto.timezone);
    await this.settings.updateOne({ userId }, { $set: set, $setOnInsert: { userId } }, { upsert: true });
    return this.get(userId);
  }

  async subscribe(userId: string, sub: PushSubscriptionDto) {
    // Replace any existing entry for the same browser, and cap how many devices one account can register.
    await this.settings.updateOne({ userId }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
    await this.settings.updateOne(
      { userId },
      { $push: { pushSubscriptions: { $each: [sub], $slice: -5 } }, $setOnInsert: { userId } },
      { upsert: true },
    );
    return this.get(userId);
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.settings.updateOne({ userId }, { $pull: { pushSubscriptions: { endpoint } } });
    return this.get(userId);
  }
}
