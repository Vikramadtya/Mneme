import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { ReviewLog } from '../learning/schemas/review-log.schema.js';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { NEW_PROGRESS } from '../learning/spaced-repetition.service.js';
import { VocabularyCollection } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from '../vocabulary/schemas/vocabulary-item.schema.js';

type Ref = { _id: unknown; userId: string; wordId: string };

const key = (userId: string, wordId: string) => `${userId}:${wordId}`;

export interface IntegrityReport {
  orphanProgress: number;
  duplicateProgress: number;
  missingProgress: number;
  orphanLogs: number;
  staleCollectionIds: number;
}

/**
 * Repairs data left behind by older versions: progress, review logs and collection entries
 * for words that no longer exist, duplicate progress records, and words with no progress
 * (which never show up in study sessions). Idempotent, so it simply runs on every boot.
 */
@Injectable()
export class DataIntegrityService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataIntegrityService.name);

  constructor(
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
  ) {}

  onApplicationBootstrap() {
    // Don't hold up startup; the app reads correctly without it.
    this.repair().catch((error) => this.logger.error(`Data repair failed: ${error}`));
  }

  async repair(): Promise<IntegrityReport> {
    // Words newer than this may still be mid-creation by a live request, so leave them alone.
    const settled = new Date(Date.now() - 60_000);
    const words = await this.vocab.find().select('_id createdBy createdAt').lean();
    const owned = new Set(words.map((w) => key(w.createdBy, String(w._id))));

    // Keep the most-reviewed (then most recent) record per word; everything else goes.
    const kept = new Set<string>();
    const orphans: Ref[] = [];
    const duplicateIds: unknown[] = [];
    const records = this.progress
      .find()
      .select('_id userId wordId')
      .sort({ reviewCount: -1, updatedAt: -1 })
      .lean()
      .cursor();
    for await (const p of records) {
      const k = key(p.userId, p.wordId);
      if (!owned.has(k)) orphans.push(p);
      else if (kept.has(k)) duplicateIds.push(p._id);
      else kept.add(k);
    }
    const orphanIds = await this.stillMissing(orphans);
    if (orphanIds.length || duplicateIds.length) {
      await this.progress.deleteMany({ _id: { $in: [...orphanIds, ...duplicateIds] } });
    }
    // The unique index can't be built while duplicates exist, so make sure it exists now.
    await this.progress.createIndexes();

    const untracked = words.filter(
      (w) => (!w.createdAt || w.createdAt < settled) && !kept.has(key(w.createdBy, String(w._id))),
    );
    if (untracked.length) {
      // Upsert so a review landing at the same moment is never overwritten.
      await this.progress.bulkWrite(
        untracked.map((w) => ({
          updateOne: {
            filter: { userId: w.createdBy, wordId: String(w._id) },
            update: { $setOnInsert: NEW_PROGRESS() },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    const logOrphans: Ref[] = [];
    for await (const log of this.logs.find().select('_id userId wordId').lean().cursor()) {
      if (!owned.has(key(log.userId, log.wordId))) logOrphans.push(log);
    }
    const orphanLogIds = await this.stillMissing(logOrphans);
    if (orphanLogIds.length) await this.logs.deleteMany({ _id: { $in: orphanLogIds } });

    let staleCollectionIds = 0;
    for await (const col of this.collections.find().select('_id userId wordIds').lean().cursor()) {
      const candidates = (col.wordIds ?? []).filter((id) => !owned.has(key(col.userId, id)));
      if (!candidates.length) continue;
      const refs = candidates.map((wordId) => ({ _id: wordId, userId: col.userId, wordId }));
      const stale = (await this.stillMissing(refs)) as string[];
      if (!stale.length) continue;
      staleCollectionIds += stale.length;
      await this.collections.updateOne({ _id: col._id }, { $pull: { wordIds: { $in: stale } } });
    }

    const report = {
      orphanProgress: orphanIds.length,
      duplicateProgress: duplicateIds.length,
      missingProgress: untracked.length,
      orphanLogs: orphanLogIds.length,
      staleCollectionIds,
    };
    if (Object.values(report).some(Boolean)) this.logger.log(`Repaired data: ${JSON.stringify(report)}`);
    return report;
  }

  /** Re-checks candidates against the database right before deleting, in case a word was created meanwhile. */
  private async stillMissing(refs: Ref[]): Promise<unknown[]> {
    if (!refs.length) return [];
    const ids = [...new Set(refs.map((r) => r.wordId))].filter((id) => isValidObjectId(id));
    const found = await this.vocab.find({ _id: { $in: ids } }).select('_id createdBy').lean();
    const exists = new Set(found.map((w) => key(w.createdBy, String(w._id))));
    return refs.filter((r) => !exists.has(key(r.userId, r.wordId))).map((r) => r._id);
  }
}
