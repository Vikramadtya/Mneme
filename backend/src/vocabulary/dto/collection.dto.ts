import { PartialType } from '@nestjs/mapped-types';
import { ArrayMaxSize, IsArray, IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCollectionDto {
  @IsString() @MinLength(1) @MaxLength(60) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}

export class UpdateWordsDto {
  @IsArray() @ArrayMaxSize(10000) @IsMongoId({ each: true })
  wordIds: string[];
}
