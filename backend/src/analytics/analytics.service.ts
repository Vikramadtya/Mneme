/* oxlint-disable unicorn/no-thenable -- `then` is Mongo $switch syntax */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewLog } from '../learning/schemas/review-log.schema.js';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { VocabularyCollection } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from '../vocabulary/schemas/vocabulary-item.schema.js';

const DAYS = 30;
const DAY_MS = 86_400_000;

function validTimezone(tz?: string): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
  ) {}

  async summary(userId: string, timezone?: string) {
    const tz = validTimezone(timezone);
    const [activity, confidence, collections] = await Promise.all([
      this.activity(userId, tz),
      this.confidence(userId),
      this.collectionAccuracy(userId),
    ]);
    return { activity, confidence, collections };
  }

  private async activity(userId: string, timeZone: string) {
    // One extra day so the oldest local day is fully covered whatever the offset.
    const since = new Date(Date.now() - (DAYS + 1) * DAY_MS);
    const perDay = (date: string) => ({
      $group: { _id: { $dateToString: { format: '%Y-%m-%d', date, timezone: timeZone } }, count: { $sum: 1 } },
    });

    const [reviews, words] = await Promise.all([
      this.logs.aggregate([{ $match: { userId, reviewedAt: { $gte: since } } }, perDay('$reviewedAt')]),
      this.vocab.aggregate([{ $match: { createdBy: userId, createdAt: { $gte: since } } }, perDay('$createdAt')]),
    ]);
    const reviewsByDay = new Map(reviews.map((r) => [r._id as string, r.count as number]));
    const wordsByDay = new Map(words.map((w) => [w._id as string, w.count as number]));

    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    return Array.from({ length: DAYS }, (_, i) => {
      const date = dayKey.format(new Date(Date.now() - (DAYS - 1 - i) * DAY_MS));
      return { date, reviews: reviewsByDay.get(date) ?? 0, newWords: wordsByDay.get(date) ?? 0 };
    });
  }

  private async confidence(userId: string) {
    const [row] = await this.progress.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ['$state', 'NEW'] }, then: 'low' },
                { case: { $or: [{ $eq: ['$state', 'GRADUATED'] }, { $gt: ['$stability', 10] }] }, then: 'high' },
                { case: { $lt: ['$difficulty', 1.8] }, then: 'low' },
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
    return { high: row?.high ?? 0, medium: row?.medium ?? 0, low: row?.low ?? 0 };
  }

  private async collectionAccuracy(userId: string) {
    const [collections, progress] = await Promise.all([
      this.collections.find({ userId }).sort({ createdAt: 1 }).lean(),
      this.progress.find({ userId }).select('wordId successCount failureCount').lean(),
    ]);
    const byWord = new Map(progress.map((p) => [p.wordId, p]));

    return collections.map((col) => {
      let success = 0;
      let total = 0;
      for (const wordId of col.wordIds ?? []) {
        const p = byWord.get(wordId);
        if (!p) continue;
        success += p.successCount || 0;
        total += (p.successCount || 0) + (p.failureCount || 0);
      }
      return {
        id: String(col._id),
        name: col.name,
        wordCount: col.wordIds?.length ?? 0,
        accuracyPercent: total ? Math.round((success / total) * 100) : 0,
      };
    });
  }
}
