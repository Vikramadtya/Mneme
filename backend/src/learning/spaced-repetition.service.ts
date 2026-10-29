import { Injectable } from '@nestjs/common';

const DAY_MS = 86_400_000;

export interface ProgressState {
  state: string;
  /** SM-2 easiness factor. */
  difficulty: number;
  /** SM-2 interval in days. */
  stability: number;
  /** SM-2 repetitions. */
  reviewCount: number;
  successCount: number;
  failureCount: number;
  lastReviewedAt?: Date;
  nextReviewAt: Date;
}

export const NEW_PROGRESS = (): ProgressState => ({
  state: 'NEW',
  difficulty: 2.5,
  stability: 0,
  reviewCount: 0,
  successCount: 0,
  failureCount: 0,
  nextReviewAt: new Date(),
});

@Injectable()
export class SpacedRepetitionService {
  /** Pure SM-2 step: returns the new state without mutating the input. */
  processReview(current: ProgressState, grade: number, now = new Date()): ProgressState {
    let interval = current.stability || 0;
    let reps = current.reviewCount || 0;
    let state: string;
    let successCount = current.successCount || 0;
    let failureCount = current.failureCount || 0;

    if (grade >= 3) {
      interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * (current.difficulty || 2.5));
      reps += 1;
      successCount += 1;
      state = interval > 21 ? 'GRADUATED' : 'LEARNING';
    } else {
      reps = 0;
      interval = 1;
      failureCount += 1;
      state = 'LEARNING';
    }

    const q = 5 - grade;
    const easiness = Math.max(1.3, (current.difficulty || 2.5) + (0.1 - q * (0.08 + q * 0.02)));

    return {
      state,
      difficulty: easiness,
      stability: interval,
      reviewCount: reps,
      successCount,
      failureCount,
      lastReviewedAt: now,
      nextReviewAt: new Date(now.getTime() + interval * DAY_MS),
    };
  }
}
