/** Batch prefix printed before every token number ("95-0043"). */
export const TOKEN_PREFIX = '95';

/** "0043": the token (form) number as the four digits printed on the pass. */
export function tokenNumber(formNo: number): string {
  return String(formNo).padStart(4, '0');
}

/** "95-0043": the token as written in the SMS; also the member's photo file name. */
export function tokenLabel(formNo: number): string {
  return `${TOKEN_PREFIX}-${tokenNumber(formNo)}`;
}
