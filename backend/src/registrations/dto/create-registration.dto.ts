import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { CleanOptionalText, CleanText, ToBoolean } from '../../common/sanitize.js';

export const T_SHIRT_SIZES = ['M', 'L', 'XL', 'XXL'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
/** Stored in T_EventForm.Gender (varchar(5)): M = male, F = female. */
export const GENDERS = ['M', 'F'] as const;
export const BD_MOBILE_PATTERN = /^01[3-9][0-9]{8}$/;

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Accepts Bengali digits, spaces, dashes and a +88 prefix; returns 01XXXXXXXXX. */
export function normalizeMobile(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let digits = value.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d))).replace(/[\s-]/g, '');
  if (digits.startsWith('+88')) digits = digits.slice(3);
  else if (digits.startsWith('88') && digits.length === 13) digits = digits.slice(2);
  return digits;
}

/**
 * A member's paper form, entered by a Register/Admin user. Fields follow
 * hsc95."T_EventForm". Gender, e-mail and payment method are on the paper
 * form but have no column, so they are not accepted (see database/README.md).
 */
export class CreateRegistrationDto {
  /** Pre-printed paper form number; left empty, the next free number is used. */
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  formNo?: number;

  @CleanText()
  @IsString()
  @Length(2, 200)
  memberName!: string;

  @CleanOptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  collegeName?: string;

  @CleanOptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  thanaName?: string;

  @CleanOptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zilaName?: string;

  @CleanOptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  workType?: string;

  @CleanOptionalText()
  @IsOptional()
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: string;

  @CleanOptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  workPlaceAddress?: string;

  @Transform(({ value }) => normalizeMobile(value))
  @IsString()
  @Matches(BD_MOBILE_PATTERN, { message: 'mobileNo must be a valid 11-digit Bangladeshi mobile number' })
  mobileNo!: string;

  @CleanOptionalText()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebookId?: string;

  @CleanText()
  @IsIn(T_SHIRT_SIZES)
  tShirtSize!: string;

  @CleanText()
  @IsIn(GENDERS, { message: 'gender must be M or F' })
  gender!: 'M' | 'F';

  @ToBoolean()
  @IsBoolean()
  includeDriver!: boolean;
}
