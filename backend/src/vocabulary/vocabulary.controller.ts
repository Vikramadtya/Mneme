import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserId } from '../auth/user.decorator.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { AiAssistService } from './ai-assist.service.js';
import { AiAssistDto, BulkAddDto } from './dto/bulk.dto.js';
import { CollectionQueryDto } from './dto/ids.dto.js';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto.js';
import { VocabularyService } from './vocabulary.service.js';

@Controller('api/v1/vocabulary')
export class VocabularyController {
  constructor(
    @Inject(VocabularyService) private vocabulary: VocabularyService,
    @Inject(AiAssistService) private ai: AiAssistService,
  ) {}

  @Get('me')
  list(@UserId() userId: string) {
    return this.vocabulary.list(userId);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('bulk')
  addMany(@Body() body: BulkAddDto, @Query() query: CollectionQueryDto, @UserId() userId: string) {
    return this.vocabulary.addMany(userId, body.items, query.collectionId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('ai-assist')
  aiAssist(@Body() body: AiAssistDto) {
    return this.ai.suggest(body.word, body.meaning);
  }

  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: string, @UserId() userId: string) {
    return this.vocabulary.get(userId, id);
  }

  @Post()
  add(@Body() body: CreateWordDto, @Query() query: CollectionQueryDto, @UserId() userId: string) {
    return this.vocabulary.add(userId, body, query.collectionId);
  }

  @Put(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateWordDto,
    @Query() query: CollectionQueryDto,
    @UserId() userId: string,
  ) {
    return this.vocabulary.update(userId, id, body, query.collectionId);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @UserId() userId: string) {
    return this.vocabulary.remove(userId, id);
  }
}
