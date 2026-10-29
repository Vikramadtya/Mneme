import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { UserId } from '../auth/user.decorator.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { CollectionService } from './collection.service.js';
import { CreateCollectionDto, UpdateCollectionDto, UpdateWordsDto } from './dto/collection.dto.js';

@Controller('api/v1/collections')
export class CollectionController {
  constructor(@Inject(CollectionService) private collections: CollectionService) {}

  @Get()
  list(@UserId() userId: string) {
    return this.collections.list(userId);
  }

  @Post()
  create(@Body() body: CreateCollectionDto, @UserId() userId: string) {
    return this.collections.create(userId, body);
  }

  @Put(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() body: UpdateCollectionDto, @UserId() userId: string) {
    return this.collections.update(userId, id, body);
  }

  @Put(':id/words')
  setWords(@Param('id', ParseObjectIdPipe) id: string, @Body() body: UpdateWordsDto, @UserId() userId: string) {
    return this.collections.setWords(userId, id, body.wordIds);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @UserId() userId: string) {
    return this.collections.remove(userId, id);
  }
}
