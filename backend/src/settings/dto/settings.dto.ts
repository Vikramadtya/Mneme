import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsInt() @Min(1) @Max(1000)
  dailyGoal?: number;

  /** 0-23, or null to turn reminders off. */
  @IsOptional() @IsInt() @Min(0) @Max(23)
  reminderHour?: number | null;

  @IsOptional() @IsString() @MaxLength(64)
  timezone?: string;
}

class PushKeysDto {
  @IsString() @IsNotEmpty() @MaxLength(200) p256dh: string;
  @IsString() @IsNotEmpty() @MaxLength(200) auth: string;
}

export class PushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(1000)
  endpoint: string;

  @IsObject() @ValidateNested() @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribeDto {
  @IsString() @MaxLength(1000)
  endpoint: string;
}
