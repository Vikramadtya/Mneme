import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserWordProgressSchema } from '../learning/schemas/user-word-progress.schema.js';
import { ReviewLogSchema } from '../learning/schemas/review-log.schema.js';
import { VocabularyItemSchema } from '../vocabulary/schemas/vocabulary-item.schema.js';
import { VocabularyCollectionSchema } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { AnalyticsController } from './analytics.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UserWordProgress', schema: UserWordProgressSchema },
      { name: 'ReviewLog', schema: ReviewLogSchema },
      { name: 'VocabularyItem', schema: VocabularyItemSchema },
      { name: 'VocabularyCollection', schema: VocabularyCollectionSchema }
    ])
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
