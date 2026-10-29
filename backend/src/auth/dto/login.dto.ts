import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  credential: string;
}
