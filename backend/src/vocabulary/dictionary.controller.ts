import { BadRequestException, Controller, Get, Inject, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DictionaryService } from './dictionary.service.js';

@Controller('api/v1/dictionary')
export class DictionaryController {
  constructor(@Inject(DictionaryService) private dictionary: DictionaryService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':word')
  async lookupWord(@Param('word') word: string) {
    if (word.length > 60) throw new BadRequestException('Word is too long');
    const entry = await this.dictionary.lookup(word);
    return {
      word,
      definition: entry?.definitions[0] ?? '',
      example: entry?.examples[0] ?? '',
      pronunciation: entry?.pronunciation ?? '',
      audioUrl: entry?.audioUrl ?? '',
      definitions: entry?.definitions ?? [],
      examples: entry?.examples ?? [],
      synonyms: entry?.synonyms ?? [],
      antonyms: entry?.antonyms ?? [],
      origin: entry?.origin ?? '',
      meanings: entry?.meanings ?? [],
    };
  }
}
