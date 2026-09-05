import { Controller, Get, Headers } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(
    @InjectModel('ReviewLog') private reviewLogModel: Model<any>,
    @InjectModel('VocabularyItem') private vocabModel: Model<any>,
    @InjectModel('UserWordProgress') private progressModel: Model<any>,
    @InjectModel('VocabularyCollection') private collectionModel: Model<any>
  ) {}

  private getUserId(headers: any): string {
    return headers['x-user-id'] || '0000-0000-0000-0000';
  }

  // The original endpoints
  @Get('activity')
  async getActivity(@Headers() headers: any) {
    return this.getActivityLogic(this.getUserId(headers));
  }

  @Get('confidence')
  async getConfidence(@Headers() headers: any) {
    return this.getConfidenceLogic(this.getUserId(headers));
  }

  @Get('collections')
  async getCollectionsAnalytics(@Headers() headers: any) {
    return this.getCollectionsAnalyticsLogic(this.getUserId(headers));
  }

  // NEW AGGREGATE ENDPOINT
  @Get('summary')
  async getSummary(@Headers() headers: any) {
    const userId = this.getUserId(headers);
    const [activityData, confidence, collections] = await Promise.all([
      this.getActivityLogic(userId),
      this.getConfidenceLogic(userId),
      this.getCollectionsAnalyticsLogic(userId)
    ]);
    
    return { 
      activity: activityData.activity, 
      confidence, 
      collections 
    };
  }

  // Business Logic
  private async getActivityLogic(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logs = await this.reviewLogModel.find({ userId, reviewedAt: { $gte: thirtyDaysAgo } }).exec();
    const words = await this.vocabModel.find({ createdAt: { $gte: thirtyDaysAgo } }).exec();
    
    const reviewsMap = new Map();
    const wordsMap = new Map();
    
    const formatDate = (d: any) => d.toISOString().split('T')[0];
    
    for (const log of logs) {
      const date = formatDate(log.reviewedAt);
      reviewsMap.set(date, (reviewsMap.get(date) || 0) + 1);
    }
    
    for (const word of words) {
      const date = formatDate(word.createdAt);
      wordsMap.set(date, (wordsMap.get(date) || 0) + 1);
    }
    
    const activity = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dateStr = formatDate(day);
      
      activity.push({
        date: dateStr,
        reviews: reviewsMap.get(dateStr) || 0,
        newWords: wordsMap.get(dateStr) || 0
      });
    }
    return { activity };
  }

  private async getConfidenceLogic(userId: string) {
    const validWords = await this.vocabModel.find().select('_id').exec();
    const validWordIds = new Set(validWords.map(w => w._id.toString()));

    const progressList = await this.progressModel.find({ userId }).exec();
    
    const seen = new Set();
    let high = 0, medium = 0, low = 0;
    
    for (const p of progressList) {
      if (validWordIds.has(p.wordId) && !seen.has(p.wordId)) {
        seen.add(p.wordId);
        
        if (p.state === 'NEW') low++;
        else if (p.state === 'GRADUATED' || p.stability > 10.0) high++;
        else if (p.difficulty > 7.0) low++;
        else medium++;
      }
    }
    return { high, medium, low };
  }

  private async getCollectionsAnalyticsLogic(userId: string) {
    const progressList = await this.progressModel.find({ userId }).exec();
    const progressMap = new Map();
    
    // Deduplicate in map
    for (const p of progressList) {
      if (!progressMap.has(p.wordId)) progressMap.set(p.wordId, p);
    }

    const collections = await this.collectionModel.find({ userId }).exec();
    
    const result = [];
    for (const col of collections) {
      const wordIds = col.wordIds || [];
      let totalReviews = 0, successReviews = 0;
      
      for (const wid of wordIds) {
        const p = progressMap.get(wid);
        if (p) {
          totalReviews += p.reviewCount || 0;
          successReviews += p.successCount || 0;
        }
      }
      
      const accuracy = totalReviews > 0 ? (successReviews / totalReviews) * 100 : 0.0;
      result.push({
        name: col.name,
        id: col._id.toString(),
        wordCount: wordIds.length,
        accuracyPercent: Math.round(accuracy)
      });
    }
    
    return result;
  }
}
