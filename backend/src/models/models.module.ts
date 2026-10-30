import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VocabularyItem, VocabularyItemSchema } from '../vocabulary/schemas/vocabulary-item.schema.js';
import { VocabularyCollection, VocabularyCollectionSchema } from '../vocabulary/schemas/vocabulary-collection.schema.js';
import { UserWordProgress, UserWordProgressSchema } from '../learning/schemas/user-word-progress.schema.js';
import { ReviewLog, ReviewLogSchema } from '../learning/schemas/review-log.schema.js';
import { UserSettings, UserSettingsSchema } from '../settings/schemas/user-settings.schema.js';

const models = MongooseModule.forFeature([
  { name: VocabularyItem.name, schema: VocabularyItemSchema },
  { name: VocabularyCollection.name, schema: VocabularyCollectionSchema },
  { name: UserWordProgress.name, schema: UserWordProgressSchema },
  { name: ReviewLog.name, schema: ReviewLogSchema },
  { name: UserSettings.name, schema: UserSettingsSchema },
]);

@Global()
@Module({ imports: [models], exports: [models] })
export class ModelsModule {}
