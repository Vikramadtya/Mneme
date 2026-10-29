import { IsMongoId, IsOptional } from 'class-validator';

export class CollectionQueryDto {
  @IsOptional() @IsMongoId() collectionId?: string;
}
