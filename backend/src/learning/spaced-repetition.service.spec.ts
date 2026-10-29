import { NEW_PROGRESS, SpacedRepetitionService } from './spaced-repetition.service.js';

describe('SpacedRepetitionService', () => {
  const srs = new SpacedRepetitionService();
  const now = new Date('2026-01-01T00:00:00Z');
  const DAY = 86_400_000;

  it('schedules 1 day, then 6 days, then interval * EF on successful reviews', () => {
    const first = srs.processReview(NEW_PROGRESS(), 5, now);
    expect(first.stability).toBe(1);
    expect(first.nextReviewAt.getTime()).toBe(now.getTime() + DAY);

    const second = srs.processReview(first, 5, now);
    expect(second.stability).toBe(6);

    const third = srs.processReview(second, 5, now);
    expect(third.stability).toBe(Math.round(6 * second.difficulty));
    expect(third.successCount).toBe(3);
  });

  it('resets repetitions and interval on failure', () => {
    const learned = srs.processReview(srs.processReview(NEW_PROGRESS(), 5, now), 5, now);
    const failed = srs.processReview(learned, 1, now);
    expect(failed).toMatchObject({ reviewCount: 0, stability: 1, state: 'LEARNING', failureCount: 1 });
  });

  it('graduates once the interval exceeds 21 days', () => {
    let p = NEW_PROGRESS();
    for (let i = 0; i < 5; i++) p = srs.processReview(p, 5, now);
    expect(p.state).toBe('GRADUATED');
  });

  it('never lets easiness drop below 1.3 and never produces NaN', () => {
    let p = NEW_PROGRESS();
    for (let i = 0; i < 20; i++) p = srs.processReview(p, 0, now);
    expect(p.difficulty).toBe(1.3);
    expect(Number.isNaN(p.nextReviewAt.getTime())).toBe(false);
  });

  it('does not mutate its input', () => {
    const input = NEW_PROGRESS();
    srs.processReview(input, 4, now);
    expect(input.reviewCount).toBe(0);
  });
});
