import { Injectable } from '@nestjs/common';
import { UserWordProgress } from './schemas/user-word-progress.schema.js';

@Injectable()
export class SpacedRepetitionService {
  
  processReview(progress: any, grade: number): any {
    progress.lastReviewedAt = new Date();
    progress.reviewCount = (progress.reviewCount || 0) + 1;
    
    if (grade >= 3) {
      progress.successCount = (progress.successCount || 0) + 1;
      progress.state = 'GRADUATED';
      progress.difficulty = Math.max(1.0, (progress.difficulty || 5.0) - 0.5);
      progress.stability = (progress.stability || 0.0) + (grade === 4 ? 2.0 : 1.0);
      
      const nextReviewDays = Math.max(1, progress.stability);
      progress.nextReviewAt = new Date(Date.now() + nextReviewDays * 86400000);
    } else {
      progress.failureCount = (progress.failureCount || 0) + 1;
      progress.state = 'LEARNING';
      progress.difficulty = Math.min(10.0, (progress.difficulty || 5.0) + 1.0);
      progress.stability = Math.max(0.1, (progress.stability || 0.0) - 0.5);
      
      progress.nextReviewAt = new Date(Date.now() + 600000); // 10 minutes
    }
    return progress;
  }
}
