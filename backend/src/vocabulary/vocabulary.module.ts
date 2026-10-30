import { Module } from '@nestjs/common';
import { AiAssistService } from './ai-assist.service.js';
import { PublicCollectionController } from './public-collection.controller.js';
import { SharingService } from './sharing.service.js';
import { CollectionController } from './collection.controller.js';
import { CollectionService } from './collection.service.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';
import { VocabularyController } from './vocabulary.controller.js';
import { VocabularyService } from './vocabulary.service.js';
import { WordCleanupService } from './word-cleanup.service.js';

@Module({
  controllers: [VocabularyController, CollectionController, DictionaryController, PublicCollectionController],
  providers: [VocabularyService, CollectionService, DictionaryService, WordCleanupService, AiAssistService, SharingService],
  exports: [CollectionService, WordCleanupService, AiAssistService],
})
export class VocabularyModule {}
