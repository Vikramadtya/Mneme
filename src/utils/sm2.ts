export interface SM2Data {
  repetition?: number;
  easeFactor?: number;
  interval?: number;
}

export function calculateNextSM2(
  data: SM2Data,
  quality: number,
): SM2Data & { nextReviewDate: string } {
  let { repetition = 0, easeFactor = 2.5, interval = 0 } = data;

  if (quality >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetition++;
  } else {
    repetition = 0;
    interval = 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReviewDate = nextDate.toISOString().split("T")[0];

  return { repetition, easeFactor, interval, nextReviewDate };
}

export function getNextInterval(data: SM2Data, quality: number): number {
  return calculateNextSM2(data, quality).interval || 1;
}
