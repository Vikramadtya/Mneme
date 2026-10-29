import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';
import { VocabularyController } from './vocabulary.controller.js';
import { VocabularyService } from './vocabulary.service.js';
import { WordCleanupService } from './word-cleanup.service.js';

@Module({
  controllers: [VocabularyController, CollectionController, DictionaryController],
  providers: [VocabularyService, CollectionService, DictionaryService, WordCleanupService],
  exports: [CollectionService, WordCleanupService],
})
export class VocabularyModule {}
