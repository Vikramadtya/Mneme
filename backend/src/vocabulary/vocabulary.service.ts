import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserWordProgress } from '../learning/schemas/user-word-progress.schema.js';
import { CollectionService } from './collection.service.js';
import { DictionaryService } from './dictionary.service.js';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto.js';
import { VocabularyCollection } from './schemas/vocabulary-collection.schema.js';
import { VocabularyItem } from './schemas/vocabulary-item.schema.js';
import { WordCleanupService } from './word-cleanup.service.js';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectModel(VocabularyItem.name) private vocab: Model<VocabularyItem>,
    @InjectModel(UserWordProgress.name) private progress: Model<UserWordProgress>,
    @InjectModel(VocabularyCollection.name) private collectionModel: Model<VocabularyCollection>,
    @Inject(CollectionService) private collections: CollectionService,
    @Inject(DictionaryService) private dictionary: DictionaryService,
    @Inject(WordCleanupService) private cleanup: WordCleanupService,
  ) {}

  list(userId: string) {
    return this.vocab.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
  }

  async get(userId: string, id: string) {
    const word = await this.vocab.findOne({ _id: id, createdBy: userId }).lean();
    if (!word) throw new NotFoundException('Word not found');
    return word;
  }

  async add(userId: string, dto: CreateWordDto, collectionId?: string) {
    const [details, target] = await Promise.all([
      this.dictionary.enrich(dto),
      collectionId ? this.collections.find(userId, collectionId) : this.collections.ensureInbox(userId),
    ]);
    if (!target) throw new NotFoundException('Collection not found');
    if (!details.definitions?.length) details.definitions = ['No definition available.'];

    const word = await this.vocab.create({ ...details, createdBy: userId });
    const wordId = String(word._id);
    try {
      await this.progress.create({ userId, wordId });
      await this.collectionModel.updateOne({ _id: target._id, userId }, { $addToSet: { wordIds: wordId } });
    } catch (error) {
      await this.cleanup.purge(userId, [wordId]); // never leave a headless word behind
      throw error;
    }
    return word.toObject();
  }

  async update(userId: string, id: string, dto: UpdateWordDto, collectionId?: string) {
    if (collectionId && !(await this.collections.find(userId, collectionId))) {
      throw new NotFoundException('Collection not found');
    }
    const updated = await this.vocab
      .findOneAndUpdate({ _id: id, createdBy: userId }, { $set: dto }, { returnDocument: 'after', runValidators: true })
      .lean();
    if (!updated) throw new NotFoundException('Word not found');

    if (collectionId) {
      await this.collectionModel.updateMany({ userId, _id: { $ne: collectionId }, wordIds: id }, { $pull: { wordIds: id } });
      await this.collectionModel.updateOne({ _id: collectionId, userId }, { $addToSet: { wordIds: id } });
    }
    return updated;
  }

  async remove(userId: string, id: string) {
    await this.cleanup.purge(userId, [id]);
    return { success: true };
  }
}
