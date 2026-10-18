import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, Max, Min } from 'class-validator';

/** Largest batch per request; the frontend splits bigger selections (proxy timeout). */
export const SMS_BATCH_MAX = 50;

/** The registrations (EntryId) whose members get their token number by SMS. */
export class SendSmsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SMS_BATCH_MAX)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2_147_483_647, { each: true })
  entryIds!: number[];
}
