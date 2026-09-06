import { Injectable } from '@nestjs/common';

@Injectable()
export class SpacedRepetitionService {
  
  processReview(progress: any, grade: number): any {
    progress.lastReviewedAt = new Date();
    
    // In SM-2: 
    // difficulty = Easiness Factor (EF), starts at 2.5
    // stability = Interval (I) in days
    // reviewCount = Repetitions (n)
    
    let EF = progress.difficulty || 2.5;
    let interval = progress.stability || 0;
    let reps = progress.reviewCount || 0;

    if (grade >= 3) {
      // Correct response
      if (reps === 0) {
        interval = 1;
      } else if (reps === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * EF);
      }
      reps += 1;
      progress.successCount = (progress.successCount || 0) + 1;
      progress.state = interval > 21 ? 'GRADUATED' : 'LEARNING';
    } else {
      // Incorrect response
      reps = 0;
      interval = 1;
      progress.failureCount = (progress.failureCount || 0) + 1;
      progress.state = 'LEARNING';
    }

    // Update EF (Easiness Factor) using SM-2 formula
    EF = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (EF < 1.3) EF = 1.3;

    progress.difficulty = EF;
    progress.stability = interval;
    progress.reviewCount = reps;
    
    // Calculate next review date
    progress.nextReviewAt = new Date(Date.now() + interval * 86400000);
    
    return progress;
  }
}
