import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class ReviewDto {
  @IsInt() @Min(0) @Max(5)
  grade: number;
}

export class DueQueryDto {
  @IsOptional() @IsMongoId()
  collectionId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;
}
