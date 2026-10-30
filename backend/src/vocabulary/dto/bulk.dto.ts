import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { CreateWordDto } from './word.dto.js';

export class BulkAddDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateWordDto)
  items: CreateWordDto[];
}

export class AiAssistDto {
  @IsString() @MinLength(1) @MaxLength(100) word: string;
  /** The definition the user already has, so suggestions match the intended sense. */
  @IsOptional() @IsString() @MaxLength(500) meaning?: string;
}
