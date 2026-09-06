import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { UserId } from '../auth/user.decorator.js';
import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserWordProgress } from './schemas/user-word-progress.schema.js';
import { ReviewLog } from './schemas/review-log.schema.js';
import { SpacedRepetitionService } from './spaced-repetition.service.js';

@Controller('api/v1/learning')
@UseGuards(AuthGuard)
export class LearningController {
  constructor(
    @InjectModel(UserWordProgress.name) private progressModel: Model<UserWordProgress>,
    @InjectModel(ReviewLog.name) private reviewLogModel: Model<ReviewLog>,
    @InjectModel('VocabularyItem') private vocabModel: Model<any>,
    @InjectModel('VocabularyCollection') private collectionModel: Model<any>,
    private srsService: SpacedRepetitionService
  ) {}



  @Post(':wordId/review')
  async submitReview(@Param('wordId') wordId: string, @Body('grade') grade: number, @UserId() userId: string) {
    let progress = await this.progressModel.findOne({ userId, wordId }).exec();
    
    if (!progress) {
      progress = new this.progressModel({
        userId, wordId, state: 'NEW', difficulty: 5.0, stability: 0.0, reviewCount: 0, successCount: 0, failureCount: 0
      });
    }

    progress = this.srsService.processReview(progress, grade);
    await (progress as any).save();
    
    await new this.reviewLogModel({ userId, wordId, grade }).save();
    return progress;
  }
  
  // The old endpoints that FE used
  @Get('today')
  async getTodayReviews(@Query('collectionId') collectionId: string, @UserId() userId: string) {
    return this.getDueReviewsLogic(userId, collectionId);
  }

  @Get('stats')
  async getStats(@UserId() userId: string) {
    return this.getStatsLogic(userId);
  }
  
  // NEW AGGREGATE ENDPOINT
@Get('dashboard-overview')
  async getDashboardOverview(@UserId() userId: string) {
    let collections = await this.collectionModel.find({ userId }).exec();
    
    // BUG FIX: Auto-create Inbox on first login
    if (!collections || collections.length === 0) {
        const inbox = new this.collectionModel({ name: 'Inbox', userId, wordIds: [] });
        await inbox.save();
        collections = [inbox];
    }

    const [stats, todayReviews] = await Promise.all([
      this.getStatsLogic(userId),
      this.getDueReviewsLogic(userId, null)
    ]);
    
    return { stats, collections, todayReviews };
  }

  // Business Logic Methods
  private async getDueReviewsLogic(userId: string, collectionId: string | null) {
    let dueProgress = await this.progressModel.find({ 
      userId, 
      nextReviewAt: { $lte: new Date() } 
    }).exec();

    // Deduplicate by wordId
    const uniqueProgress = [];
    const seen = new Set();
    for (const p of dueProgress) {
      if (!seen.has(p.wordId)) {
        seen.add(p.wordId);
        uniqueProgress.push(p);
      }
    }
    
    let filteredProgress = uniqueProgress;
    if (collectionId) {
      const collection = await this.collectionModel.findById(collectionId).exec();
      if (collection && collection.wordIds) {
        const allowed = new Set(collection.wordIds);
        filteredProgress = uniqueProgress.filter(p => allowed.has(p.wordId));
      }
    }

    const reviews = [];
    for (const progress of filteredProgress) {
      const vocabulary = await this.vocabModel.findById(progress.wordId).exec();
      if (vocabulary) {
        reviews.push({ progress, vocabulary });
      }
    }
    return reviews;
  }

  private async getStatsLogic(userId: string) {
    const validWords = await this.vocabModel.find({ createdBy: userId }).select('_id').exec();
    console.log('validWords count:', validWords.length);
    const validWordIds = new Set(validWords.map(w => w._id.toString()));

    const allProgress = await this.progressModel.find({ userId }).exec();
    console.log('allProgress count:', allProgress.length);
    
    // Auto-Healing logic from previous session is mostly obsolete if we use transactions, 
    // but we can still deduplicate and filter out orphans defensively.
    const uniqueList = [];
    const seen = new Set();
    
    for (const p of allProgress) {
      if (validWordIds.has(p.wordId) && !seen.has(p.wordId)) {
        seen.add(p.wordId);
        uniqueList.push(p);
      }
    }

    const now = new Date();
    let dueCount = 0, newCount = 0, learningCount = 0, graduatedCount = 0;
    let totalReviews = 0, successReviews = 0;

    for (const p of uniqueList) {
      if (new Date(p.nextReviewAt) <= now && p.state !== 'NEW') dueCount++;
      if (p.state === 'NEW') newCount++;
      if (p.state === 'LEARNING') learningCount++;
      if (p.state === 'GRADUATED') graduatedCount++;
      
      totalReviews += p.reviewCount || 0;
      successReviews += p.successCount || 0;
    }

    const accuracy = totalReviews > 0 ? (successReviews / totalReviews) * 100 : 0.0;
    
    return {
      totalWords: validWordIds.size,
      dueCount,
      newCount,
      learningCount,
      graduatedCount,
      accuracyPercent: Math.round(accuracy)
    };
  }
}
