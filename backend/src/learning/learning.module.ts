import { Module } from '@nestjs/common';
import { VocabularyModule } from '../vocabulary/vocabulary.module.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';
import { SpacedRepetitionService } from './spaced-repetition.service.js';

@Module({
  imports: [VocabularyModule],
  controllers: [LearningController],
  providers: [LearningService, SpacedRepetitionService],
})
export class LearningModule {}
