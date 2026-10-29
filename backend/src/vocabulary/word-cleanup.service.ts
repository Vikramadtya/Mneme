import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewLog } from '../learning/schemas/review-log.schema.js';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from './schemas/vocabulary-item.schema.js';

/** Deletes words together with everything that references them, in a fixed number of queries. */
@Injectable()
export class WordCleanupService {
  constructor(
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
  ) {}

  async purge(userId: string, wordIds: string[]): Promise<void> {
    if (!wordIds.length) return;
    await Promise.all([
      this.vocab.deleteMany({ createdBy: userId, _id: { $in: wordIds } }),
      this.progress.deleteMany({ userId, wordId: { $in: wordIds } }),
      this.logs.deleteMany({ userId, wordId: { $in: wordIds } }),
      this.collections.updateMany({ userId, wordIds: { $in: wordIds } }, { $pull: { wordIds: { $in: wordIds } } }),
    ]);
  }
}
