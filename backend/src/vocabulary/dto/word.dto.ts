import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const strings = { each: true } as const;

export class MeaningDefinitionDto {
  @IsString() @MaxLength(2000) definition: string;
  @IsOptional() @IsString() @MaxLength(2000) example?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString(strings) synonyms?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString(strings) antonyms?: string[];
}

export class MeaningDto {
  @IsString() @MaxLength(50) partOfSpeech: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MeaningDefinitionDto)
  definitions: MeaningDefinitionDto[];

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString(strings) synonyms?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString(strings) antonyms?: string[];
}

export class CreateWordDto {
  @IsString() @MinLength(1) @MaxLength(100) word: string;

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString(strings) @MaxLength(2000, strings)
  definitions?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString(strings) @MaxLength(2000, strings)
  examples?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString(strings) @MaxLength(100, strings)
  synonyms?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString(strings) @MaxLength(100, strings)
  antonyms?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MeaningDto)
  meanings?: MeaningDto[];

  @IsOptional() @IsString() @MaxLength(100) pronunciation?: string;
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) audioUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) origin?: string;
  @IsOptional() @IsString() @MaxLength(10000) notes?: string;
}

export class UpdateWordDto extends PartialType(CreateWordDto) {}
