import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VocabularyItem, VocabularyItemSchema } from './schemas/vocabulary-item.schema.js';
import { VocabularyCollection, VocabularyCollectionSchema } from './schemas/vocabulary-collection.schema.js';
import { UserWordProgress, UserWordProgressSchema } from '../learning/schemas/user-word-progress.schema.js';
import { VocabularyController } from './vocabulary.controller.js';
import { CollectionController } from './collection.controller.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VocabularyItem.name, schema: VocabularyItemSchema },
      { name: VocabularyCollection.name, schema: VocabularyCollectionSchema },
      { name: 'UserWordProgress', schema: UserWordProgressSchema } // injected for transaction
    ])
  ],
  controllers: [VocabularyController, CollectionController, DictionaryController],
  providers: [DictionaryService]
})
export class VocabularyModule {}
