import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto.js';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from './schemas/vocabulary-item.schema.js';
import { WordCleanupService } from './word-cleanup.service.js';

const DUPLICATE_KEY = 11000;

@Injectable()
export class CollectionService {
  constructor(
    @InjectModel(VocabularyCollection.name) private collections: Model<VocabularyCollection>,
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @Inject(WordCleanupService) private cleanup: WordCleanupService,
  ) {}

  list(userId: string) {
    return this.collections.find({ userId }).sort({ createdAt: 1 }).lean();
  }

  find(userId: string, id: string) {
    return this.collections.findOne({ _id: id, userId }).lean();
  }

  /** Atomic get-or-create; safe under concurrent requests thanks to the partial unique index. */
  async ensureInbox(userId: string) {
    const upsert = () =>
      this.collections
        .findOneAndUpdate({ userId, name: 'Inbox' }, { $setOnInsert: { wordIds: [] } }, { upsert: true, returnDocument: 'after' })
        .lean();
    try {
      return await upsert();
    } catch (error: any) {
      if (error?.code !== DUPLICATE_KEY) throw error;
      return upsert();
    }
  }

  async create(userId: string, dto: CreateCollectionDto) {
    return (await this.collections.create({ ...dto, userId, wordIds: [] })).toObject();
  }

  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    const updated = await this.collections
      .findOneAndUpdate({ _id: id, userId }, { $set: dto }, { returnDocument: 'after' })
      .lean();
    if (!updated) throw new NotFoundException('Collection not found');
    return updated;
  }

  async setWords(userId: string, id: string, wordIds: string[]) {
    const owned = await this.vocab.find({ createdBy: userId, _id: { $in: wordIds } }).select('_id').lean();
    const updated = await this.collections
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: { wordIds: owned.map((w) => String(w._id)) } },
        { returnDocument: 'after' },
      )
      .lean();
    if (!updated) throw new NotFoundException('Collection not found');
    return updated;
  }

  /** Deleting a collection also deletes the words it contains. */
  async remove(userId: string, id: string) {
    const collection = await this.find(userId, id);
    if (!collection) return { success: true };
    await this.cleanup.purge(userId, collection.wordIds ?? []);
    await this.collections.deleteOne({ _id: id, userId });
    return { success: true };
  }
}
