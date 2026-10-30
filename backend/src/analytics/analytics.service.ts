/* oxlint-disable unicorn/no-thenable -- `then` is Mongo $switch syntax */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewLog } from '../learning/schemas/review-log.schema.js';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { VocabularyCollection } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { DEFAULT_DAILY_GOAL, validTimezone } from '../settings/settings.service.js';
import { UserSettings } from '../settings/schemas/user-settings.schema.js';
import { VocabularyItem } from '../vocabulary/schemas/vocabulary-item.schema.js';

const DAYS = 30;
const HEATMAP_DAYS = 365;
const DAY_MS = 86_400_000;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
    @InjectModel(UserSettings.name) private settings: Model<UserSettings>,
  ) {}

  async summary(userId: string, timezone?: string) {
    const tz = validTimezone(timezone);
    const wordIds = await this.ownedWordIds(userId);
    const [heatmap, confidence, collections, settings] = await Promise.all([
      this.heatmap(userId, tz),
      this.confidence(userId, wordIds),
      this.collectionAccuracy(userId, wordIds),
      this.settings.findOne({ userId }).select('dailyGoal').lean(),
    ]);
    const activity = await this.activity(userId, tz, heatmap);
    const counts = new Map(heatmap.map((d) => [d.date, d.count]));
    return {
      activity,
      heatmap,
      streak: this.streak(heatmap),
      today: { reviews: heatmap[heatmap.length - 1]?.count ?? 0, goal: settings?.dailyGoal ?? DEFAULT_DAILY_GOAL },
      totalReviews: [...counts.values()].reduce((a, b) => a + b, 0),
      confidence,
      collections,
    };
  }

  /** Reviews per local day for the last year, oldest first, with empty days included. */
  private async heatmap(userId: string, timeZone: string) {
    const since = new Date(Date.now() - (HEATMAP_DAYS + 1) * DAY_MS);
    const rows = await this.logs.aggregate([
      { $match: { userId, reviewedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt', timezone: timeZone } }, count: { $sum: 1 } } },
    ]);
    const byDay = new Map(rows.map((r) => [r._id as string, r.count as number]));
    return this.days(HEATMAP_DAYS, timeZone).map((date) => ({ date, count: byDay.get(date) ?? 0 }));
  }

  /** Consecutive days with at least one review. Today doesn't break a streak that is still alive. */
  private streak(heatmap: { date: string; count: number }[]) {
    let longest = 0;
    let run = 0;
    for (const day of heatmap) {
      run = day.count > 0 ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    let current = 0;
    let i = heatmap.length - 1;
    if (heatmap[i]?.count === 0) i -= 1; // nothing yet today: the streak may still be alive from yesterday
    for (; i >= 0 && heatmap[i].count > 0; i--) current += 1;
    return { current, longest };
  }

  private days(count: number, timeZone: string): string[] {
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    return Array.from({ length: count }, (_, i) => dayKey.format(new Date(Date.now() - (count - 1 - i) * DAY_MS)));
  }

  /** Counts are driven by the words that exist, so stale progress or collection entries can't inflate them. */
  private async ownedWordIds(userId: string): Promise<string[]> {
    const words = await this.vocab.find({ createdBy: userId }).select('_id').lean();
    return words.map((w) => String(w._id));
  }

  private async activity(userId: string, timeZone: string, heatmap: { date: string; count: number }[]) {
    // One extra day so the oldest local day is fully covered whatever the offset.
    const since = new Date(Date.now() - (DAYS + 1) * DAY_MS);
    const words = await this.vocab.aggregate([
      { $match: { createdBy: userId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: timeZone } }, count: { $sum: 1 } } },
    ]);
    const reviewsByDay = new Map(heatmap.map((d) => [d.date, d.count]));
    const wordsByDay = new Map(words.map((w) => [w._id as string, w.count as number]));
    return this.days(DAYS, timeZone).map((date) => ({
      date,
      reviews: reviewsByDay.get(date) ?? 0,
      newWords: wordsByDay.get(date) ?? 0,
    }));
  }

  private async confidence(userId: string, wordIds: string[]) {
    const [row] = await this.progress.aggregate([
      { $match: { userId, wordId: { $in: wordIds } } },
      // Legacy data may hold several progress records per word; count each word once.
      { $group: { _id: '$wordId', state: { $first: '$state' }, stability: { $first: '$stability' }, difficulty: { $first: '$difficulty' }, algo: { $first: '$algo' } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ['$state', 'NEW'] }, then: 'low' },
                { case: { $or: [{ $eq: ['$state', 'GRADUATED'] }, { $gt: ['$stability', 10] }] }, then: 'high' },
                // FSRS difficulty runs 1-10 (high is hard); the old SM-2 easiness factor runs the other way.
                { case: { $and: [{ $eq: ['$algo', 'fsrs'] }, { $gt: ['$difficulty', 7] }] }, then: 'low' },
                { case: { $and: [{ $ne: ['$algo', 'fsrs'] }, { $lt: ['$difficulty', 1.8] }] }, then: 'low' },
              ],
              default: 'medium',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $group: { _id: null, buckets: { $push: { k: '$_id', v: '$count' } } } },
      { $replaceRoot: { newRoot: { $arrayToObject: '$buckets' } } },
    ]);
    const high = row?.high ?? 0;
    const medium = row?.medium ?? 0;
    // Words never reviewed have no progress record yet; they count as low confidence.
    return { high, medium, low: wordIds.length - high - medium };
  }

  private async collectionAccuracy(userId: string, wordIds: string[]) {
    const [collections, progress] = await Promise.all([
      this.collections.find({ userId }).sort({ createdAt: 1 }).lean(),
      this.progress.find({ userId, wordId: { $in: wordIds } }).select('wordId successCount failureCount').lean(),
    ]);
    const byWord = new Map(progress.map((p) => [p.wordId, p]));
    const owned = new Set(wordIds);

    return collections.map((col) => {
      let success = 0;
      let total = 0;
      const ids = (col.wordIds ?? []).filter((id) => owned.has(id));
      for (const wordId of ids) {
        const p = byWord.get(wordId);
        if (!p) continue;
        success += p.successCount || 0;
        total += (p.successCount || 0) + (p.failureCount || 0);
      }
      return {
        id: String(col._id),
        name: col.name,
        wordCount: ids.length,
        accuracyPercent: total ? Math.round((success / total) * 100) : 0,
      };
    });
  }
}
