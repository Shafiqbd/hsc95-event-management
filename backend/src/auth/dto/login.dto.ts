import { IsString, Length } from 'class-validator';
import { CleanText } from '../../common/sanitize.js';

export class LoginDto {
  @CleanText()
  @IsString()
  @Length(1, 100)
  loginName!: string;

  // Not trimmed: whitespace may be part of a password.
  @IsString()
  @Length(1, 128)
  password!: string;
}
