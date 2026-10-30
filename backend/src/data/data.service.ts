import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewLog } from '../learning/schemas/review-log.schema.js';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { VocabularyCollection } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from '../vocabulary/schemas/vocabulary-item.schema.js';

const LIMITS = { vocabulary: 20_000, collections: 500, progress: 20_000, logs: 200_000 };
const CHUNK = 1000;
const OLD_INBOX = 'Inbox (pre-import)';

const VOCAB_FIELDS = [
  'word', 'meanings', 'pronunciation', 'audioUrl', 'origin', 'notes', 'definitions',
  'examples', 'synonyms', 'antonyms', 'difficulty', 'topics', 'relatedWords', 'createdAt', 'updatedAt',
];
const PROGRESS_FIELDS = [
  'state', 'difficulty', 'stability', 'reviewCount', 'successCount', 'failureCount',
  'lapses', 'algo', 'lastReviewedAt', 'nextReviewAt',
];

function pick(source: any, keys: string[]) {
  const out: Record<string, any> = {};
  for (const key of keys) if (source[key] !== undefined && source[key] !== null) out[key] = source[key];
  return out;
}

function list(value: unknown, name: keyof typeof LIMITS): any[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BadRequestException(`"${name}" must be an array`);
  if (value.length > LIMITS[name]) throw new BadRequestException(`"${name}" has too many entries`);
  if (value.some((v) => !v || typeof v !== 'object')) throw new BadRequestException(`"${name}" has invalid entries`);
  return value;
}

@Injectable()
export class DataService {
  constructor(
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
    @InjectModel(ReviewLog.name) private logs: Model<ReviewLog>,
  ) {}

  async export(userId: string) {
    const [vocabulary, collections, progress, logs] = await Promise.all([
      this.vocab.find({ createdBy: userId }).lean(),
      this.collections.find({ userId }).lean(),
      this.progress.find({ userId }).lean(),
      this.logs.find({ userId }).lean(),
    ]);
    return { version: 1, timestamp: new Date().toISOString(), data: { vocabulary, collections, progress, logs } };
  }

  /**
   * Replaces the user's data with the backup. Everything is validated and re-keyed to the
   * caller (new ids, owner forced to the caller) before anything is written, and old data is
   * only removed after the new data was inserted successfully.
   */
  async import(userId: string, body: any) {
    if (!body || body.version !== 1 || !body.data || typeof body.data !== 'object') {
      throw new BadRequestException('Invalid backup file format');
    }
    const input = {
      vocabulary: list(body.data.vocabulary, 'vocabulary'),
      collections: list(body.data.collections, 'collections'),
      progress: list(body.data.progress, 'progress'),
      logs: list(body.data.logs, 'logs'),
    };

    const idMap = new Map<string, string>();
    const remap = (id: unknown) => idMap.get(String(id));

    const vocabulary = input.vocabulary.map((v) => {
      if (typeof v.word !== 'string' || !v.word.trim() || v.word.length > 100) {
        throw new BadRequestException('Backup contains a word without a valid "word"');
      }
      const _id = new Types.ObjectId();
      const oldId = v.id ?? v._id;
      if (oldId !== undefined) idMap.set(String(oldId), String(_id));
      return { ...pick(v, VOCAB_FIELDS), _id, createdBy: userId };
    });

    const collections = input.collections.map((c) => {
      if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 60) {
        throw new BadRequestException('Backup contains a collection without a valid "name"');
      }
      const wordIds = Array.isArray(c.wordIds) ? (c.wordIds as unknown[]).map(remap).filter((id): id is string => !!id) : [];
      return {
        name: c.name,
        description: typeof c.description === 'string' ? c.description.slice(0, 500) : undefined,
        userId,
        wordIds: [...new Set(wordIds)],
      };
    });

    const seen = new Set<string>();
    const progress = input.progress.flatMap((p) => {
      const wordId = remap(p.wordId);
      if (!wordId || seen.has(wordId)) return [];
      seen.add(wordId);
      return [{ ...pick(p, PROGRESS_FIELDS), userId, wordId }];
    });

    const logs = input.logs.flatMap((l) => {
      const wordId = remap(l.wordId);
      const grade = Number(l.grade);
      if (!wordId || !Number.isInteger(grade) || grade < 0 || grade > 5) return [];
      return [{ userId, wordId, grade, ...(l.reviewedAt ? { reviewedAt: l.reviewedAt } : {}) }];
    });

    const previous = await this.snapshotIds(userId);

    // The Inbox is unique per user, so park the old one while the imported data is inserted.
    await this.collections.updateMany({ userId, name: 'Inbox' }, { $set: { name: OLD_INBOX } });
    try {
      await this.insert(this.vocab, vocabulary);
      await this.insert(this.collections, collections);
      await this.insert(this.progress, progress);
      await this.insert(this.logs, logs);
    } catch {
      await this.deleteIds(userId, previous, false);
      await this.collections.updateMany({ userId, name: OLD_INBOX }, { $set: { name: 'Inbox' } });
      throw new BadRequestException('Backup contains invalid data');
    }

    await this.deleteIds(userId, previous, true);
    return { success: true, imported: { vocabulary: vocabulary.length, collections: collections.length } };
  }

  private async insert(model: Model<any>, docs: any[]) {
    for (let i = 0; i < docs.length; i += CHUNK) {
      await model.insertMany(docs.slice(i, i + CHUNK), { ordered: true });
    }
  }

  private async snapshotIds(userId: string) {
    const ids = (model: Model<any>, owner: string) =>
      model.find({ [owner]: userId }).select('_id').lean().then((docs) => docs.map((d) => d._id as Types.ObjectId));
    const [vocab, collections, progress, logs] = await Promise.all([
      ids(this.vocab, 'createdBy'),
      ids(this.collections, 'userId'),
      ids(this.progress, 'userId'),
      ids(this.logs, 'userId'),
    ]);
    return { vocab, collections, progress, logs };
  }

  /** `previous: true` removes the old data set, `false` removes everything that is not part of it. */
  private async deleteIds(userId: string, ids: Awaited<ReturnType<DataService['snapshotIds']>>, previous: boolean) {
    const targets: [Model<any>, string, Types.ObjectId[]][] = [
      [this.vocab, 'createdBy', ids.vocab],
      [this.collections, 'userId', ids.collections],
      [this.progress, 'userId', ids.progress],
      [this.logs, 'userId', ids.logs],
    ];
    await Promise.all(
      targets.map(async ([model, owner, list]) => {
        if (!previous) return model.deleteMany({ [owner]: userId, _id: { $nin: list } });
        for (let i = 0; i < list.length; i += 10_000) {
          await model.deleteMany({ [owner]: userId, _id: { $in: list.slice(i, i + 10_000) } });
        }
      }),
    );
  }
}
