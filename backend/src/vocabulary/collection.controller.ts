import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { UserId } from '../auth/user.decorator.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { CollectionService } from './collection.service.js';
import { SharingService } from './sharing.service.js';
import { CreateCollectionDto, UpdateCollectionDto, UpdateWordsDto } from './dto/collection.dto.js';

@Controller('api/v1/collections')
export class CollectionController {
  constructor(
    @Inject(CollectionService) private collections: CollectionService,
    @Inject(SharingService) private sharing: SharingService,
  ) {}

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

  @HttpCode(200)
  @Post(':id/share')
  share(@Param('id', ParseObjectIdPipe) id: string, @UserId() userId: string) {
    return this.sharing.share(userId, id);
  }

  @Delete(':id/share')
  unshare(@Param('id', ParseObjectIdPipe) id: string, @UserId() userId: string) {
    return this.sharing.unshare(userId, id);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @UserId() userId: string) {
    return this.collections.remove(userId, id);
  }
}
