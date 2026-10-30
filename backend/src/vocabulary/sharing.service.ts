import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { Model } from 'mongoose';
import { NEW_PROGRESS } from '../learning/spaced-repetition.service.js';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { CollectionService } from './collection.service.js';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from './schemas/vocabulary-item.schema.js';

const MAX_SHARED_WORDS = 500;
/** Content fields that travel with a shared word; nothing about the owner or their progress does. */
const WORD_FIELDS = ['word', 'meanings', 'pronunciation', 'audioUrl', 'origin', 'notes', 'definitions', 'examples', 'synonyms', 'antonyms'] as const;

@Injectable()
export class SharingService {
  constructor(
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @Inject(CollectionService) private collectionService: CollectionService,
  ) {}

  async share(userId: string, id: string) {
    const collection = await this.collectionService.find(userId, id);
    if (!collection) throw new NotFoundException('Collection not found');
    if (collection.name === 'Inbox') throw new BadRequestException('The Inbox cannot be shared');
    if ((collection.wordIds?.length ?? 0) > MAX_SHARED_WORDS) {
      throw new BadRequestException(`Only collections with up to ${MAX_SHARED_WORDS} words can be shared`);
    }
    if (collection.shareId) return { shareId: collection.shareId };

    const shareId = randomBytes(9).toString('base64url');
    await this.collections.updateOne({ _id: id, userId }, { $set: { shareId } });
    return { shareId };
  }

  async unshare(userId: string, id: string) {
    const result = await this.collections.updateOne({ _id: id, userId }, { $unset: { shareId: '' } });
    if (!result.matchedCount) throw new NotFoundException('Collection not found');
    return { success: true };
  }

  /** What anyone with the link may see. */
  async view(shareId: string) {
    const collection = await this.collections.findOne({ shareId }).lean();
    if (!collection) throw new NotFoundException('This shared collection does not exist or is no longer shared');
    const words = await this.vocab
      .find({ createdBy: collection.userId, _id: { $in: collection.wordIds ?? [] } })
      .select(WORD_FIELDS.join(' '))
      .sort({ word: 1 })
      .lean();
    return {
      name: collection.name,
      description: collection.description ?? '',
      wordCount: words.length,
      words: words.map(({ _id, ...rest }) => rest),
    };
  }

  /** Copies a shared collection into the caller's account as a new collection. */
  async importInto(userId: string, shareId: string) {
    const source = await this.collections.findOne({ shareId }).lean();
    if (!source) throw new NotFoundException('This shared collection does not exist or is no longer shared');

    const [words, owned] = await Promise.all([
      this.vocab.find({ createdBy: source.userId, _id: { $in: source.wordIds ?? [] } }).lean(),
      this.vocab.find({ createdBy: userId }).select('word').lean(),
    ]);
    const have = new Set(owned.map((w) => w.word.trim().toLowerCase()));
    const fresh = words.filter((w) => !have.has(w.word.trim().toLowerCase()));

    const copy = await this.collections.create({
      userId,
      name: source.name === 'Inbox' ? 'Imported' : source.name,
      description: source.description,
      wordIds: [],
    });
    if (fresh.length) {
      const created = await this.vocab.insertMany(
        fresh.map((w) => ({
          ...Object.fromEntries(WORD_FIELDS.map((k) => [k, (w as any)[k]]).filter(([, v]) => v !== undefined && v !== null)),
          createdBy: userId,
        })),
      );
      const ids = created.map((w) => String(w._id));
      await this.progress.insertMany(ids.map((wordId) => ({ ...NEW_PROGRESS(), userId, wordId })));
      await this.collections.updateOne({ _id: copy._id }, { $set: { wordIds: ids } });
    }
    return { collectionId: String(copy._id), imported: fresh.length, skipped: words.length - fresh.length };
  }
}
