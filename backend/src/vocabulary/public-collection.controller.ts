import { Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { UserId } from '../auth/user.decorator.js';
import { SharingService } from './sharing.service.js';

@Controller('api/v1/public/collections')
export class PublicCollectionController {
  constructor(@Inject(SharingService) private sharing: SharingService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':shareId')
  view(@Param('shareId') shareId: string) {
    return this.sharing.view(shareId.slice(0, 40));
  }

  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':shareId/import')
  importInto(@Param('shareId') shareId: string, @UserId() userId: string) {
    return this.sharing.importInto(userId, shareId.slice(0, 40));
  }
}
