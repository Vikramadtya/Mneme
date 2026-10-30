import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export const REVIEW_MODES = ['flip', 'typed', 'cloze', 'reverse'] as const;

export class ReviewDto {
  @IsInt() @Min(0) @Max(5)
  grade: number;

  @IsOptional() @IsIn(REVIEW_MODES)
  mode?: (typeof REVIEW_MODES)[number];

  /** When the review happened, for reviews that were queued offline. */
  @IsOptional() @IsISO8601()
  at?: string;
}

export class DueQueryDto {
  @IsOptional() @IsMongoId()
  collectionId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;
}
