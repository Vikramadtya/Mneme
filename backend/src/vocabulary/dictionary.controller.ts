import { Controller, Get, Param } from '@nestjs/common';
import { DictionaryService } from './dictionary.service.js';

@Controller('api/v1/dictionary')
export class DictionaryController {
  constructor(private dictionaryService: DictionaryService) {}

  @Get(':word')
  async lookupWord(@Param('word') word: string) {
    return this.dictionaryService.fetchWordDetails({ word });
  }
}
