import { Injectable } from '@nestjs/common';

const DAY_MS = 86_400_000;

/** FSRS-4.5 default weights. */
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246,
  1.587, 0.2272, 2.8755,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const TARGET_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 36_500;
/** Number of lapses after which a word is flagged as a leech. */
export const LEECH_LAPSES = 8;

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface ProgressState {
  state: string;
  /** FSRS difficulty, 1 (easy) to 10 (hard). */
  difficulty: number;
  /** FSRS stability: days for recall probability to fall to 90%. */
  stability: number;
  /** Total reviews. */
  reviewCount: number;
  successCount: number;
  failureCount: number;
  /** Times a learned word was forgotten. */
  lapses?: number;
  /** Scheduler that produced difficulty/stability; records without it come from the old SM-2 scheduler. */
  algo?: 'fsrs';
  lastReviewedAt?: Date;
  nextReviewAt: Date;
}

export const NEW_PROGRESS = (): ProgressState => ({
  state: 'NEW',
  difficulty: 0,
  stability: 0,
  reviewCount: 0,
  successCount: 0,
  failureCount: 0,
  lapses: 0,
  algo: 'fsrs',
  nextReviewAt: new Date(),
});

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Old grades ran 0-5; the UI sends 1-4. Anything out of range is clamped. */
export function toRating(grade: number): Rating {
  return clamp(Math.round(grade), 1, 4) as Rating;
}

@Injectable()
export class SpacedRepetitionService {
  /** Pure FSRS step: returns the new state without mutating the input. */
  processReview(current: ProgressState, grade: number, now = new Date()): ProgressState {
    const rating = toRating(grade);
    const prev = this.upgrade(current);
    const isFirst = prev.reviewCount === 0 || !prev.lastReviewedAt;

    let difficulty: number;
    let stability: number;
    let lapses = prev.lapses ?? 0;

    if (isFirst) {
      difficulty = this.initDifficulty(rating);
      stability = this.initStability(rating);
    } else {
      const elapsedDays = Math.max(0, (now.getTime() - prev.lastReviewedAt!.getTime()) / DAY_MS);
      const retrievability = this.retrievability(elapsedDays, prev.stability);
      difficulty = this.nextDifficulty(prev.difficulty, rating);
      if (rating === 1) {
        stability = this.forgetStability(prev.difficulty, prev.stability, retrievability);
        lapses += 1;
      } else {
        stability = this.recallStability(prev.difficulty, prev.stability, retrievability, rating);
      }
    }

    const interval = rating === 1 ? 1 : clamp(Math.round(this.intervalFor(stability)), 1, MAX_INTERVAL_DAYS);
    return {
      state: rating !== 1 && interval > 21 ? 'GRADUATED' : 'LEARNING',
      difficulty,
      stability,
      reviewCount: prev.reviewCount + 1,
      successCount: prev.successCount + (rating >= 2 ? 1 : 0),
      failureCount: prev.failureCount + (rating === 1 ? 1 : 0),
      lapses,
      algo: 'fsrs',
      lastReviewedAt: now,
      nextReviewAt: new Date(now.getTime() + interval * DAY_MS),
    };
  }

  /** Days until each rating would next show the card; used to label the answer buttons. */
  previewIntervals(current: ProgressState, now = new Date()): Record<Rating, number> {
    const out = {} as Record<Rating, number>;
    for (const rating of [1, 2, 3, 4] as Rating[]) {
      const next = this.processReview(current, rating, now);
      out[rating] = Math.round((next.nextReviewAt.getTime() - now.getTime()) / DAY_MS);
    }
    return out;
  }

  /** Records written by the old SM-2 scheduler carry an easiness factor and interval; map them onto FSRS. */
  upgrade(p: ProgressState): ProgressState {
    if (p.algo === 'fsrs') return p;
    if (!p.reviewCount && !p.successCount && !p.failureCount) return { ...p, ...NEW_PROGRESS(), nextReviewAt: p.nextReviewAt };
    const easiness = p.difficulty || 2.5;
    return {
      ...p,
      difficulty: clamp(11 - ((easiness - 1.3) / 1.7) * 8 - 1, 1, 10),
      stability: Math.max(1, p.stability || 1),
      reviewCount: p.successCount + p.failureCount,
      lapses: p.lapses ?? p.failureCount,
      algo: 'fsrs',
      lastReviewedAt: p.lastReviewedAt ?? new Date(p.nextReviewAt.getTime() - Math.max(1, p.stability || 1) * DAY_MS),
    };
  }

  retrievability(elapsedDays: number, stability: number): number {
    return Math.pow(1 + (FACTOR * elapsedDays) / Math.max(stability, 0.01), DECAY);
  }

  private intervalFor(stability: number): number {
    return (stability / FACTOR) * (Math.pow(TARGET_RETENTION, 1 / DECAY) - 1);
  }

  private initStability(rating: Rating): number {
    return Math.max(W[rating - 1], 0.1);
  }

  private initDifficulty(rating: Rating): number {
    return clamp(W[4] - (rating - 3) * W[5], 1, 10);
  }

  private nextDifficulty(d: number, rating: Rating): number {
    const next = d - W[6] * (rating - 3);
    return clamp(W[7] * this.initDifficulty(4) + (1 - W[7]) * next, 1, 10);
  }

  private recallStability(d: number, s: number, r: number, rating: Rating): number {
    const hardPenalty = rating === 2 ? W[15] : 1;
    const easyBonus = rating === 4 ? W[16] : 1;
    return (
      s *
      (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus)
    );
  }

  private forgetStability(d: number, s: number, r: number): number {
    const next = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
    return clamp(next, 0.1, s);
  }
}
