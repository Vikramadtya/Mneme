import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CollectionService } from '../vocabulary/collection.service.js';
import { VocabularyItem } from '../vocabulary/schemas/vocabulary-item.schema.js';
import { ReviewLog } from './schemas/review-log.schema.js';
import { UserWordProgress } from './schemas/user-word-progress.schema.js';
import { LEECH_LAPSES, NEW_PROGRESS, SpacedRepetitionService, toRating } from './spaced-repetition.service.js';

const DEFAULT_SESSION_SIZE = 100;
const MAX_BACKDATE_MS = 30 * 86_400_000;

const SNAPSHOT_FIELDS = [
  'state', 'difficulty', 'stability', 'reviewCount', 'successCount', 'failureCount',
  'lapses', 'algo', 'lastReviewedAt', 'nextReviewAt',
] as const;

/** The scheduling fields worth restoring on undo. */
function pick(p: Record<string, any>) {
  return Object.fromEntries(SNAPSHOT_FIELDS.filter((k) => p[k] !== undefined).map((k) => [k, p[k]]));
}


@Injectable()
export class LearningService {
  constructor(
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @Inject(CollectionService) private collections: CollectionService,
    @Inject(SpacedRepetitionService) private srs: SpacedRepetitionService,
  ) {}

  async review(userId: string, wordId: string, dto: { grade: number; mode?: string; at?: string }) {
    if (!(await this.vocab.exists({ _id: wordId, createdBy: userId }))) {
      throw new NotFoundException('Word not found');
    }
    // Reviews made offline are synced later; honour when they happened, but never from the future.
    const now = new Date();
    const at = dto.at ? new Date(dto.at) : now;
    const when = Number.isNaN(at.getTime()) ? now : new Date(Math.min(now.getTime(), Math.max(at.getTime(), now.getTime() - MAX_BACKDATE_MS)));

    const before = (await this.progress.findOne({ userId, wordId }).lean()) ?? NEW_PROGRESS();
    if (before.lastReviewedAt && when < new Date(before.lastReviewedAt)) {
      // Already reviewed after this offline review happened; keep the log but don't rewind the schedule.
      await this.logs.create({ userId, wordId, grade: toRating(dto.grade), mode: dto.mode, reviewedAt: when });
      return before;
    }
    const next = this.srs.processReview(before as any, dto.grade, when);

    const [updated] = await Promise.all([
      this.progress.findOneAndUpdate({ userId, wordId }, { $set: next }, { upsert: true, returnDocument: 'after' }).lean(),
      this.logs.create({
        userId,
        wordId,
        grade: toRating(dto.grade),
        mode: dto.mode,
        reviewedAt: when,
        before: pick(before),
      }),
    ]);
    return updated;
  }

  /** Reverts the most recent review of a word, restoring the schedule it had before. */
  async undo(userId: string, wordId: string) {
    const last = await this.logs.findOne({ userId, wordId }).sort({ reviewedAt: -1, _id: -1 }).lean();
    if (!last?.before) throw new NotFoundException('Nothing to undo');
    const update: Record<string, any> = { $set: last.before };
    if (!last.before.lastReviewedAt) update.$unset = { lastReviewedAt: '' };
    const restored = await this.progress
      .findOneAndUpdate({ userId, wordId }, update, { upsert: true, returnDocument: 'after' })
      .lean();
    await this.logs.deleteOne({ _id: last._id });
    return restored;
  }

  async due(userId: string, collectionId?: string, limit = DEFAULT_SESSION_SIZE) {
    const filter: Record<string, any> = { userId, nextReviewAt: { $lte: new Date() } };
    if (collectionId) {
      const collection = await this.collections.find(userId, collectionId);
      if (!collection?.wordIds?.length) return [];
      filter.wordId = { $in: collection.wordIds };
    }

    const due = await this.progress.find(filter).sort({ nextReviewAt: 1 }).limit(limit).lean();
    const words = await this.vocab.find({ createdBy: userId, _id: { $in: due.map((p) => p.wordId) } }).lean();
    const byId = new Map(words.map((w) => [String(w._id), w]));

    return due.flatMap((progress) => {
      const vocabulary = byId.get(progress.wordId);
      if (!vocabulary) return [];
      return [
        {
          progress,
          vocabulary,
          intervals: this.srs.previewIntervals(progress as any),
          leech: (progress.lapses ?? 0) >= LEECH_LAPSES,
        },
      ];
    });
  }

  /** Light per-word progress, so the vocabulary list can filter by status without loading review data. */
  async progressList(userId: string) {
    const rows = await this.progress
      .find({ userId })
      .select('wordId state nextReviewAt lapses reviewCount stability')
      .lean();
    return rows.map((p) => ({
      wordId: p.wordId,
      state: p.state,
      nextReviewAt: p.nextReviewAt,
      reviewCount: p.reviewCount,
      lapses: p.lapses ?? 0,
      leech: (p.lapses ?? 0) >= LEECH_LAPSES,
    }));
  }

  async overview(userId: string) {
    let collections = await this.collections.list(userId);
    if (!collections.length) collections = [await this.collections.ensureInbox(userId)];
    return { stats: await this.stats(userId), collections };
  }

  private async stats(userId: string) {
    const now = new Date();
    const countState = (state: string) => ({ $sum: { $cond: [{ $eq: ['$state', state] }, 1, 0] } });

    const wordIds = (await this.vocab.find({ createdBy: userId }).select('_id').lean()).map((w) => String(w._id));
    const totalWords = wordIds.length;
    const [agg] = await this.progress.aggregate([
      { $match: { userId, wordId: { $in: wordIds } } },
      {
        $group: {
          _id: null,
          dueCount: {
            $sum: { $cond: [{ $and: [{ $lte: ['$nextReviewAt', now] }, { $ne: ['$state', 'NEW'] }] }, 1, 0] },
          },
          newCount: countState('NEW'),
          learningCount: countState('LEARNING'),
          graduatedCount: countState('GRADUATED'),
          success: { $sum: '$successCount' },
          failure: { $sum: '$failureCount' },
          tracked: { $sum: 1 },
          leechCount: { $sum: { $cond: [{ $gte: ['$lapses', LEECH_LAPSES] }, 1, 0] } },
        },
      },
    ]);

    const total = (agg?.success ?? 0) + (agg?.failure ?? 0);
    return {
      totalWords,
      dueCount: agg?.dueCount ?? 0,
      // Words never reviewed may have no progress record; they are new too.
      newCount: (agg?.newCount ?? 0) + Math.max(0, totalWords - (agg?.tracked ?? 0)),
      learningCount: agg?.learningCount ?? 0,
      leechCount: agg?.leechCount ?? 0,
      graduatedCount: agg?.graduatedCount ?? 0,
      accuracyPercent: total ? Math.round(((agg.success ?? 0) / total) * 100) : 0,
    };
  }
}
