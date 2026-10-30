import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { UserId } from '../auth/user.decorator.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { DueQueryDto, ReviewDto } from './dto/review.dto.js';
import { LearningService } from './learning.service.js';

@Controller('api/v1/learning')
export class LearningController {
  constructor(@Inject(LearningService) private learning: LearningService) {}

  @HttpCode(200)
  @Post(':wordId/review')
  review(@Param('wordId', ParseObjectIdPipe) wordId: string, @Body() body: ReviewDto, @UserId() userId: string) {
    return this.learning.review(userId, wordId, body);
  }

  @HttpCode(200)
  @Post(':wordId/undo')
  undo(@Param('wordId', ParseObjectIdPipe) wordId: string, @UserId() userId: string) {
    return this.learning.undo(userId, wordId);
  }

  @Get('progress')
  progress(@UserId() userId: string) {
    return this.learning.progressList(userId);
  }

  @Get('today')
  today(@Query() query: DueQueryDto, @UserId() userId: string) {
    return this.learning.due(userId, query.collectionId, query.limit);
  }

  @Get('dashboard-overview')
  overview(@UserId() userId: string) {
    return this.learning.overview(userId);
  }
}
