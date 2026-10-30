import { NEW_PROGRESS, SpacedRepetitionService, toRating } from './spaced-repetition.service.js';

describe('SpacedRepetitionService (FSRS)', () => {
  const srs = new SpacedRepetitionService();
  const DAY = 86_400_000;
  const t0 = new Date('2026-01-01T00:00:00Z');

  /** Reviews exactly when the card is due, like a diligent user. */
  const reviewWhenDue = (p = NEW_PROGRESS(), ratings: number[], start = t0) => {
    let now = start;
    for (const r of ratings) {
      p = srs.processReview(p, r, now);
      now = p.nextReviewAt;
    }
    return p;
  };

  it('starts a new card on the initial stability for its rating', () => {
    const good = srs.processReview(NEW_PROGRESS(), 3, t0);
    expect(good.stability).toBeCloseTo(3.7145, 3);
    expect(good.nextReviewAt.getTime()).toBe(t0.getTime() + 4 * DAY);
    expect(good).toMatchObject({ state: 'LEARNING', successCount: 1, reviewCount: 1, algo: 'fsrs' });
  });

  it('schedules longer intervals for easier answers', () => {
    const [again, hard, good, easy] = [1, 2, 3, 4].map((r) => srs.processReview(NEW_PROGRESS(), r, t0));
    expect(again.nextReviewAt.getTime() - t0.getTime()).toBe(DAY);
    expect(hard.stability).toBeLessThan(good.stability);
    expect(good.stability).toBeLessThan(easy.stability);
  });

  it('grows intervals when reviews succeed on time and graduates long-lived cards', () => {
    const p1 = reviewWhenDue(NEW_PROGRESS(), [3, 3]);
    const p2 = reviewWhenDue(NEW_PROGRESS(), [3, 3, 3, 3]);
    expect(p2.stability).toBeGreaterThan(p1.stability);
    expect(reviewWhenDue(NEW_PROGRESS(), [4, 4, 4, 4, 4]).state).toBe('GRADUATED');
  });

  it('counts a lapse and cuts stability when a learned card is forgotten', () => {
    const learned = reviewWhenDue(NEW_PROGRESS(), [3, 3, 3]);
    const lapsed = srs.processReview(learned, 1, learned.nextReviewAt);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.failureCount).toBe(1);
    expect(lapsed.stability).toBeLessThan(learned.stability);
    expect(lapsed.nextReviewAt.getTime() - learned.nextReviewAt.getTime()).toBe(DAY);
  });

  it('keeps difficulty within 1..10 and never produces NaN', () => {
    let p = NEW_PROGRESS();
    let now = t0;
    for (let i = 0; i < 40; i++) {
      p = srs.processReview(p, i % 7 === 0 ? 4 : 1, now);
      now = new Date(now.getTime() + DAY);
    }
    expect(p.difficulty).toBeGreaterThanOrEqual(1);
    expect(p.difficulty).toBeLessThanOrEqual(10);
    expect(Number.isFinite(p.stability)).toBe(true);
    expect(Number.isNaN(p.nextReviewAt.getTime())).toBe(false);
  });

  it('upgrades records from the old SM-2 scheduler instead of resetting them', () => {
    const legacy = { state: 'LEARNING', difficulty: 2.5, stability: 6, reviewCount: 2, successCount: 2, failureCount: 0, nextReviewAt: new Date(t0.getTime() + 6 * DAY) };
    const next = srs.processReview(legacy as any, 3, legacy.nextReviewAt);
    expect(next.algo).toBe('fsrs');
    expect(next.stability).toBeGreaterThan(6);
    expect(next.successCount).toBe(3);
  });

  it('maps old 0-5 grades onto ratings 1-4 and previews intervals', () => {
    expect([0, 1, 2, 3, 4, 5].map(toRating)).toEqual([1, 1, 2, 3, 4, 4]);
    const preview = srs.previewIntervals(NEW_PROGRESS(), t0);
    expect(preview[1]).toBe(1);
    expect(preview[4]).toBeGreaterThan(preview[3]);
  });

  it('does not mutate its input', () => {
    const input = NEW_PROGRESS();
    srs.processReview(input, 3, t0);
    expect(input.reviewCount).toBe(0);
  });
});
