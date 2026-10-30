import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import webpush from 'web-push';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { UserSettings } from './schemas/user-settings.schema.js';

/** Local date and hour of `now` in a timezone. */
function localTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly ready: boolean;

  constructor(
    @InjectModel(UserSettings.name) private settings: Model<UserSettings>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @Inject(ConfigService) config: ConfigService,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    this.ready = Boolean(publicKey && privateKey);
    if (this.ready) {
      webpush.setVapidDetails(config.get<string>('VAPID_SUBJECT') || 'mailto:admin@example.com', publicKey!, privateKey!);
    }
  }

  /**
   * Sends today's reminder to everyone whose chosen hour has arrived and who has not had one yet today.
   * Meant to be called regularly (hourly) by an external scheduler, since free hosts sleep.
   */
  async dispatch(now = new Date()) {
    if (!this.ready) return { sent: 0, skipped: 'push is not configured' };

    const candidates = await this.settings
      .find({ reminderHour: { $ne: null }, 'pushSubscriptions.0': { $exists: true } })
      .lean();
    let sent = 0;
    for (const user of candidates) {
      const local = localTime(now, user.timezone || 'UTC');
      if (local.hour < (user.reminderHour as number) || user.lastReminderOn === local.date) continue;

      const due = await this.progress.countDocuments({ userId: user.userId, nextReviewAt: { $lte: now } });
      await this.settings.updateOne({ _id: user._id }, { $set: { lastReminderOn: local.date } });
      if (!due) continue;

      const payload = JSON.stringify({
        title: 'Time to review',
        body: `${due} ${due === 1 ? 'word is' : 'words are'} ready to review.`,
        url: '/session',
      });
      for (const sub of user.pushSubscriptions) {
        try {
          await webpush.sendNotification(sub as any, payload, { TTL: 6 * 3600 });
          sent += 1;
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await this.settings.updateOne({ _id: user._id }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
          } else {
            this.logger.warn(`Push failed: ${error?.message ?? error}`);
          }
        }
      }
    }
    return { sent };
  }
}
