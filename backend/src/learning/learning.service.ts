import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CollectionService } from '../vocabulary/collection.service.js';
import { VocabularyItem } from '../vocabulary/schemas/vocabulary-item.schema.js';
import { ReviewLog } from './schemas/review-log.schema.js';
import { UserWordProgress } from './schemas/user-word-progress.schema.js';
import { NEW_PROGRESS, SpacedRepetitionService } from './spaced-repetition.service.js';

const DEFAULT_SESSION_SIZE = 100;

@Injectable()
export class LearningService {
  constructor(
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @Inject(CollectionService) private collections: CollectionService,
    @Inject(SpacedRepetitionService) private srs: SpacedRepetitionService,
  ) {}

  async review(userId: string, wordId: string, grade: number) {
    if (!(await this.vocab.exists({ _id: wordId, createdBy: userId }))) {
      throw new NotFoundException('Word not found');
    }
    const current = (await this.progress.findOne({ userId, wordId }).lean()) ?? NEW_PROGRESS();
    const next = this.srs.processReview(current as any, grade);

    const [updated] = await Promise.all([
      this.progress.findOneAndUpdate({ userId, wordId }, { $set: next }, { upsert: true, returnDocument: 'after' }).lean(),
      this.logs.create({ userId, wordId, grade }),
    ]);
    return updated;
  }

  async due(userId: string, collectionId?: string, limit = DEFAULT_SESSION_SIZE) {
    const filter: Record<string, any> = { userId, nextReviewAt: { $lte: new Date() } };
    if (collectionId) {
      const collection = await this.collections.find(userId, collectionId);
      if (!collection?.wordIds?.length) return [];
      filter.wordId = { $in: collection.wordIds };
    }

    const due = await this.progress.find(filter).sort({ nextReviewAt: 1 }).limit(limit).lean();
    const words = await this.vocab
      .find({ createdBy: userId, _id: { $in: due.map((p) => p.wordId) } })
      .lean();
    const byId = new Map(words.map((w) => [String(w._id), w]));

    return due.flatMap((progress) => {
      const vocabulary = byId.get(progress.wordId);
      return vocabulary ? [{ progress, vocabulary }] : [];
    });
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
      graduatedCount: agg?.graduatedCount ?? 0,
      accuracyPercent: total ? Math.round(((agg.success ?? 0) / total) * 100) : 0,
    };
  }
}
