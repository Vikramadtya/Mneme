import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { UserId } from '../auth/user.decorator.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { CollectionQueryDto } from './dto/ids.dto.js';
import { CreateWordDto, UpdateWordDto } from './dto/word.dto.js';
import { VocabularyService } from './vocabulary.service.js';

@Controller('api/v1/vocabulary')
export class VocabularyController {
  constructor(@Inject(VocabularyService) private vocabulary: VocabularyService) {}

  @Get('me')
  list(@UserId() userId: string) {
    return this.vocabulary.list(userId);
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
