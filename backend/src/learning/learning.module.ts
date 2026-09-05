import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserWordProgress, UserWordProgressSchema } from './schemas/user-word-progress.schema.js';
import { ReviewLog, ReviewLogSchema } from './schemas/review-log.schema.js';
import { VocabularyItem, VocabularyItemSchema } from '../vocabulary/schemas/vocabulary-item.schema.js';
import { VocabularyCollection, VocabularyCollectionSchema } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { LearningController } from './learning.controller.js';
import { SpacedRepetitionService } from './spaced-repetition.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserWordProgress.name, schema: UserWordProgressSchema },
      { name: ReviewLog.name, schema: ReviewLogSchema },
      { name: 'VocabularyItem', schema: VocabularyItemSchema },
      { name: 'VocabularyCollection', schema: VocabularyCollectionSchema }
    ])
  ],
  controllers: [LearningController],
  providers: [SpacedRepetitionService]
})
export class LearningModule {}
