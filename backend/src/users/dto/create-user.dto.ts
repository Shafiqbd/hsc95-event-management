import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ROLES, type Role } from '../../auth/auth.types.js';
import { CleanOptionalText, CleanText } from '../../common/sanitize.js';
import { BD_MOBILE_PATTERN, normalizeMobile } from '../../registrations/dto/create-registration.dto.js';

/** New staff account, created with hsc95.sp_insert_user. Matches T_Users columns. */
export class CreateUserDto {
  @CleanText()
  @IsString()
  @Length(2, 200)
  fullName!: string;

  /** Letters, digits, dot, underscore, hyphen; case-insensitively unique. */
  @CleanText()
  @IsString()
  @Length(3, 100)
  @Matches(/^[A-Za-z0-9._-]+$/, { message: 'loginName may contain only letters, digits, ".", "_" and "-"' })
  loginName!: string;

  /** Hashed by sp_insert_user (bcrypt, which only uses the first 72 bytes). */
  @IsString()
  @Length(8, 72)
  password!: string;

  @CleanText()
  @IsEmail()
  @MaxLength(250)
  email!: string;

  @Transform(({ value }) => (value === '' ? undefined : normalizeMobile(value)))
  @IsOptional()
  @IsString()
  @Matches(BD_MOBILE_PATTERN, { message: 'contactNumber must be a valid 11-digit Bangladeshi mobile number' })
  contactNumber?: string;

  @CleanOptionalText()
  @IsIn(ROLES)
  role!: Role;
}
